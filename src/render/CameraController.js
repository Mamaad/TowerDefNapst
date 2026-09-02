import * as THREE from 'three';

const DEG = Math.PI / 180;
const GAMEPLAY_PITCH_MIN = 41 * DEG;
const GAMEPLAY_PITCH_MAX = 49 * DEG;
const GAMEPLAY_YAW_MIN = 10 * DEG;
const GAMEPLAY_YAW_MAX = 76 * DEG;
const PHOTO_PITCH_MIN = 14 * DEG;
const PHOTO_PITCH_MAX = 78 * DEG;

export const CAMERA_PRESETS = Object.freeze({
  gameplay: { yaw: 41 * DEG, pitch: 45.5 * DEG, zoom: 1.0, target: [-0.65, 0, 0.15] },
  tactical: { yaw: 39 * DEG, pitch: 46.5 * DEG, zoom: 0.82, target: [-0.45, 0, 0.12] },
  close: { yaw: 43 * DEG, pitch: 44.5 * DEG, zoom: 1.34, target: [-0.35, 0, 0.18] },
});

const expDamp = (speed, dt) => 1 - Math.exp(-speed * Math.max(0, dt));

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.distance = 18;
    this.aspect = 16 / 9;
    this.photoMode = false;
    this.shakeAmount = 0.55;

    const preset = CAMERA_PRESETS.gameplay;
    this.yaw = preset.yaw;
    this.pitch = preset.pitch;
    this.zoom = preset.zoom;
    this.targetYaw = preset.yaw;
    this.targetPitch = preset.pitch;
    this.targetZoom = preset.zoom;
    this.target = new THREE.Vector3(...preset.target);
    this.targetGoal = new THREE.Vector3(...preset.target);

    this.panVelocity = new THREE.Vector2();
    this.moveInput = new THREE.Vector2();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._basePosition = new THREE.Vector3();
    this._shakeOffset = new THREE.Vector3();
    this._impact = new THREE.Vector3();
    this._shakeEnergy = 0;
    this._shakeSeed = 0;
    this._projectionDirty = true;
    this._presetName = 'gameplay';
    this._cinematic = null;
  }

  setAspect(aspect) {
    this.aspect = Math.max(0.2, aspect || 1);
    this._projectionDirty = true;
  }

  setShakeAmount(value) {
    this.shakeAmount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
  }

  get viewHeight() {
    return 12.2 / this.zoom;
  }

  get targetViewHeight() {
    return 12.2 / this.targetZoom;
  }

  setMoveInput(x, z) {
    this.moveInput.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(z, -1, 1));
  }

  dragRotate(dx, dy) {
    this.cancelCinematic();
    const yawSpeed = this.photoMode ? 0.0072 : 0.0048;
    const pitchSpeed = this.photoMode ? 0.006 : 0.00125;
    this.targetYaw -= dx * yawSpeed;
    if (!this.photoMode) this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, GAMEPLAY_YAW_MIN, GAMEPLAY_YAW_MAX);
    this.targetPitch += dy * pitchSpeed;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch,
      this.photoMode ? PHOTO_PITCH_MIN : GAMEPLAY_PITCH_MIN,
      this.photoMode ? PHOTO_PITCH_MAX : GAMEPLAY_PITCH_MAX,
    );
    this._presetName = 'custom';
  }

  rotateStep(delta) {
    this.cancelCinematic();
    this.targetYaw += delta;
    if (!this.photoMode) this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, GAMEPLAY_YAW_MIN, GAMEPLAY_YAW_MAX);
    this._presetName = 'custom';
  }

  dragPan(dx, dy, viewportHeight) {
    this.cancelCinematic();
    if (!viewportHeight) return;
    const unitsPerPixel = this.targetViewHeight / viewportHeight;
    this._basis(this.targetYaw);
    this.targetGoal.addScaledVector(this._right, -dx * unitsPerPixel);
    this.targetGoal.addScaledVector(this._forward, -dy * unitsPerPixel);
    this.clampTarget();
    this._presetName = 'custom';
  }

  zoomBy(deltaY, anchorScene = null) {
    this.cancelCinematic();
    const factor = deltaY > 0 ? 0.9 : 1.11;
    const min = this.photoMode ? 0.56 : 0.78;
    const max = this.photoMode ? 2.05 : 1.42;
    const previous = this.targetZoom;
    this.targetZoom = THREE.MathUtils.clamp(previous * factor, min, max);
    if (anchorScene && !this.photoMode && this.targetZoom > previous) {
      const closeness = THREE.MathUtils.clamp((this.targetZoom - previous) * 0.22, 0, 0.075);
      this.targetGoal.lerp(anchorScene, closeness);
      this.clampTarget();
    }
    this._presetName = 'custom';
  }

  applyPreset(name = 'gameplay', immediate = false) {
    const preset = CAMERA_PRESETS[name] ?? CAMERA_PRESETS.gameplay;
    this._presetName = name;
    this.targetYaw = preset.yaw;
    this.targetPitch = preset.pitch;
    this.targetZoom = preset.zoom;
    this.targetGoal.set(...preset.target);
    this.panVelocity.set(0, 0);
    if (immediate) {
      this.yaw = this.targetYaw;
      this.pitch = this.targetPitch;
      this.zoom = this.targetZoom;
      this.target.copy(this.targetGoal);
    }
    this._projectionDirty = true;
  }

  recenter() {
    this.applyPreset(this._presetName === 'tactical' || this._presetName === 'close' ? this._presetName : 'gameplay', false);
  }

  setPhotoMode(enabled) {
    this.photoMode = Boolean(enabled);
    if (!this.photoMode) {
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch, GAMEPLAY_PITCH_MIN, GAMEPLAY_PITCH_MAX);
      this.targetYaw = THREE.MathUtils.clamp(this.targetYaw, GAMEPLAY_YAW_MIN, GAMEPLAY_YAW_MAX);
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom, 0.78, 1.42);
      this.clampTarget();
    }
    this._projectionDirty = true;
  }


  focusOn(scenePoint, duration = 0.62, zoom = null) {
    if (this.photoMode || !scenePoint) return;
    this._cinematic = {
      remaining: duration,
      restoreTarget: this.targetGoal.clone(),
      restoreZoom: this.targetZoom,
      restoreYaw: this.targetYaw,
      restorePitch: this.targetPitch,
    };
    this.targetGoal.lerp(scenePoint, 0.34);
    this.targetZoom = THREE.MathUtils.clamp(zoom ?? Math.max(this.targetZoom, 1.08), 0.78, 1.42);
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + 0.018, GAMEPLAY_PITCH_MIN, GAMEPLAY_PITCH_MAX);
    this.clampTarget();
  }

  cancelCinematic() {
    this._cinematic = null;
  }

  addShake(power = 0.02, impactScene = null) {
    if (this.shakeAmount <= 0) return;
    let attenuation = 1;
    if (impactScene) {
      this._impact.copy(impactScene);
      const distance = Math.hypot(this.target.x - this._impact.x, this.target.z - this._impact.z);
      attenuation = THREE.MathUtils.clamp(1 - distance / 9.5, 0.18, 1);
    }
    this._shakeEnergy = Math.min(0.11, this._shakeEnergy + power * this.shakeAmount * attenuation);
    this._shakeSeed += 1.71;
  }

  clampTarget() {
    const margin = this.photoMode ? 1.0 : 0;
    this.targetGoal.x = THREE.MathUtils.clamp(this.targetGoal.x, -5.4 - margin, 4.4 + margin);
    this.targetGoal.z = THREE.MathUtils.clamp(this.targetGoal.z, -3.25 - margin, 3.15 + margin);
  }

  _basis(yaw = this.yaw) {
    this._forward.set(Math.sin(yaw), 0, Math.cos(yaw));
    this._right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  }

  update(dt) {
    if (this._cinematic) {
      this._cinematic.remaining -= dt;
      if (this._cinematic.remaining <= 0) {
        const restore = this._cinematic;
        this._cinematic = null;
        this.targetGoal.copy(restore.restoreTarget);
        this.targetZoom = restore.restoreZoom;
        this.targetYaw = restore.restoreYaw;
        this.targetPitch = restore.restorePitch;
      }
    }
    const moveLength = this.moveInput.lengthSq();
    if (moveLength > 0) {
      const inv = moveLength > 1 ? 1 / Math.sqrt(moveLength) : 1;
      const acceleration = (this.photoMode ? 7.4 : 5.5) / Math.max(0.78, this.targetZoom);
      this.panVelocity.x += this.moveInput.x * inv * acceleration * dt;
      this.panVelocity.y += this.moveInput.y * inv * acceleration * dt;
    }
    const brake = Math.exp(-(this.photoMode ? 7 : 10.5) * dt);
    this.panVelocity.multiplyScalar(brake);
    if (this.panVelocity.lengthSq() > 0.000001) {
      this._basis(this.targetYaw);
      this.targetGoal.addScaledVector(this._right, this.panVelocity.x * dt);
      this.targetGoal.addScaledVector(this._forward, this.panVelocity.y * dt);
      this.clampTarget();
    }

    const angularDamp = expDamp(this.photoMode ? 9 : 12.5, dt);
    const targetDamp = expDamp(this.photoMode ? 7 : 10, dt);
    const zoomDamp = expDamp(11.5, dt);
    this.yaw = THREE.MathUtils.lerp(this.yaw, this.targetYaw, angularDamp);
    this.pitch = THREE.MathUtils.lerp(this.pitch, this.targetPitch, angularDamp);
    const beforeZoom = this.zoom;
    this.zoom = THREE.MathUtils.lerp(this.zoom, this.targetZoom, zoomDamp);
    this.target.lerp(this.targetGoal, targetDamp);
    if (Math.abs(beforeZoom - this.zoom) > 0.00005) this._projectionDirty = true;

    const horizontal = Math.cos(this.pitch) * this.distance;
    this._basePosition.set(
      this.target.x + Math.sin(this.yaw) * horizontal,
      Math.sin(this.pitch) * this.distance,
      this.target.z + Math.cos(this.yaw) * horizontal,
    );

    this._shakeOffset.set(0, 0, 0);
    if (this._shakeEnergy > 0.00005) {
      const phase = performance.now() * 0.032 + this._shakeSeed;
      this._shakeOffset.set(
        Math.sin(phase * 1.71) * this._shakeEnergy,
        Math.sin(phase * 2.17 + 1.2) * this._shakeEnergy * 0.28,
        Math.sin(phase * 1.37 + 2.4) * this._shakeEnergy,
      );
      this._shakeEnergy *= Math.pow(0.045, dt);
    }

    this.camera.position.copy(this._basePosition).add(this._shakeOffset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  consumeProjectionDirty() {
    const dirty = this._projectionDirty;
    this._projectionDirty = false;
    return dirty;
  }

  debug() {
    return {
      pitch: this.pitch / DEG,
      yaw: this.yaw / DEG,
      zoom: this.zoom,
      x: this.target.x,
      z: this.target.z,
      preset: this._presetName,
      photo: this.photoMode,
    };
  }
}
