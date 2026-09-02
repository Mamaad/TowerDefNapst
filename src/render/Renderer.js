import * as THREE from 'three';
import { PATH, BUILD_PADS } from '../config/map.js';
import { EnvironmentRenderer } from './EnvironmentRenderer.js';
import { BattlefieldLayer } from './BattlefieldLayer.js';
import { BattlefieldTowerRenderer } from './BattlefieldTowerRenderer.js';
import { BattlefieldEnemyRenderer } from './BattlefieldEnemyRenderer.js';
import { VfxRenderer } from './VfxRenderer.js';
import { CameraController } from './CameraController.js';
import { toScene, toGame, disposeObject } from './drawing.js';

export class Renderer {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.time = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.debugRoot = null;
    this.cameraGesture = null;
    this.ignoreNextClick = false;
    this._impactScene = new THREE.Vector3();
    this._anchorScene = new THREE.Vector3();
    this._clearColor = new THREE.Color('#2f6048');
    this._waveColor = new THREE.Color('#315d48');
    this._bossColor = new THREE.Color('#4d4a50');
    this._fogClear = new THREE.Color('#5a7660');
    this._fogBoss = new THREE.Color('#6a596a');

    this.scene = new THREE.Scene();
    this.scene.background = this._clearColor.clone();
    this.scene.fog = new THREE.FogExp2(this._fogClear, 0.0125);

    this.camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 80);
    this.cameraRig = new CameraController(this.camera);

    this.webgl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.42;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLights();
    this.env = new EnvironmentRenderer(game, this.scene);
    this.battlefield = new BattlefieldLayer(game, this.scene);
    this.towerArt = new BattlefieldTowerRenderer(game, this.scene);
    this.enemyArt = new BattlefieldEnemyRenderer(game, this.scene, this.camera);
    this.vfx = new VfxRenderer(game, this.scene, this.camera);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.bindCameraControls();
    this.resize();
    this.cameraRig.applyPreset('gameplay', true);
    this.cameraRig.update(0);
  }

  get cameraYaw() { return this.cameraRig.yaw; }
  get cameraPitch() { return this.cameraRig.pitch; }
  get zoom() { return this.cameraRig.zoom; }

  setupLights() {
    this.lights = {};
    const ambient = new THREE.AmbientLight('#edf6e4', 0.62);
    const hemisphere = new THREE.HemisphereLight('#fff8dc', '#4d704f', 2.38);
    const key = new THREE.DirectionalLight('#fff0cc', 3.2);
    key.position.set(-6.5, 13.5, 7.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -11;
    key.shadow.camera.right = 11;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 36;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.018;

    const fill = new THREE.DirectionalLight('#b9e5ff', 1.32);
    fill.position.set(7, 8, 4);
    const rim = new THREE.DirectionalLight('#efc8ff', 0.86);
    rim.position.set(5, 6, -10);

    const spawn = new THREE.PointLight('#8cffc8', 1.18, 4.1, 2);
    spawn.position.copy(toScene(PATH[0].x, PATH[0].y, 1.45));
    const nexus = new THREE.PointLight('#dda8ff', 1.34, 4.4, 2);
    nexus.position.copy(toScene(PATH.at(-1).x, PATH.at(-1).y, 1.6));

    this.scene.add(ambient, hemisphere, key, fill, rim, spawn, nexus);
    Object.assign(this.lights, { ambient, hemisphere, key, fill, rim, spawn, nexus });
  }

  bindCameraControls() {
    const start = (event) => {
      const pan = event.button === 1 || (event.button === 0 && event.shiftKey);
      const rotate = event.button === 2 || (event.button === 0 && event.altKey) ||
        (event.button === 0 && !event.shiftKey && !this.game.buildChoice && !this.game.hoverPad && !this.game.selectedTower);
      if (!rotate && !pan) return;
      event.preventDefault();
      this.cameraGesture = {
        pointerId: event.pointerId,
        mode: pan ? 'pan' : 'rotate',
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
      this.canvas.setPointerCapture?.(event.pointerId);
      this.canvas.classList.add('camera-dragging');
    };

    const move = (event) => {
      const gesture = this.cameraGesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture.x = event.clientX;
      gesture.y = event.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) gesture.moved = true;
      if (gesture.mode === 'rotate') this.cameraRig.dragRotate(dx, dy);
      else this.cameraRig.dragPan(dx, dy, this.canvas.getBoundingClientRect().height);
    };

    const end = (event) => {
      if (!this.cameraGesture || this.cameraGesture.pointerId !== event.pointerId) return;
      this.ignoreNextClick ||= this.cameraGesture.moved;
      this.canvas.releasePointerCapture?.(event.pointerId);
      this.cameraGesture = null;
      this.canvas.classList.remove('camera-dragging');
    };

    this.canvas.addEventListener('pointerdown', start);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      let anchor = null;
      if (!this.game.photoMode) {
        const gamePoint = this.screenToWorld(event.clientX, event.clientY);
        if (gamePoint) {
          this._anchorScene.copy(toScene(gamePoint.x, gamePoint.y, 0));
          anchor = this._anchorScene;
        }
      }
      this.cameraRig.zoomBy(event.deltaY, anchor);
    }, { passive: false });
  }

  consumeCameraClick() {
    if (!this.ignoreNextClick) return false;
    this.ignoreNextClick = false;
    return true;
  }

  panPixels(dx, dy) {
    this.cameraRig.dragPan(dx, dy, this.canvas.getBoundingClientRect().height);
  }

  panCamera(x, z) {
    this.cameraRig.setMoveInput(x, z);
  }

  setMoveInput(x, z) {
    this.cameraRig.setMoveInput(x, z);
  }

  rotateCamera(delta) {
    this.cameraRig.rotateStep(delta);
  }

  setCameraPreset(name) {
    this.cameraRig.applyPreset(name, false);
  }

  resetCamera() {
    this.cameraRig.applyPreset('gameplay', false);
  }

  recenterCamera() {
    this.cameraRig.recenter();
  }

  setPhotoMode(enabled) {
    this.cameraRig.setPhotoMode(enabled);
  }

  setCameraShake(value) {
    this.cameraRig.setShakeAmount(value);
  }

  focusOn(x, y, duration = 0.62, zoom = 1.08) {
    this._impactScene.copy(toScene(x, y, 0));
    this.cameraRig.focusOn(this._impactScene, duration, zoom);
  }

  kickCamera(power = 0.02, x = null, y = null) {
    let impact = null;
    if (Number.isFinite(x) && Number.isFinite(y)) {
      this._impactScene.copy(toScene(x, y, 0));
      impact = this._impactScene;
    }
    this.cameraRig.addShake(power, impact);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || window.innerWidth));
    const height = Math.max(240, Math.round(rect.height || window.innerHeight));
    this.cameraRig.setAspect(width / height);
    this.updateProjection();
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.webgl.setSize(width, height, false);
  }

  updateProjection() {
    const viewHeight = this.cameraRig.viewHeight;
    const aspect = this.cameraRig.aspect;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.updateProjectionMatrix();
  }

  setPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return true;
  }

  pickTower(clientX, clientY) {
    if (!this.setPointer(clientX, clientY)) return null;
    const hits = this.raycaster.intersectObjects(this.towerArt.group.children, true);
    return hits.find((hit) => hit.object.userData.tower)?.object.userData.tower ?? null;
  }

  screenToWorld(clientX, clientY) {
    if (!this.setPointer(clientX, clientY)) return null;
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this._impactScene)) return null;
    return toGame(this._impactScene);
  }

  updateLighting(time) {
    const boss = this.game.enemies.find((enemy) => enemy.def.boss && !enemy.dead);
    const inWave = this.game.waveManager.active;
    const clear = this.game.waveClearPulse || 0;
    const lateGame = Math.min(1, this.game.state.wave / 30);
    const bossPulse = boss ? 1 : 0;

    this.lights.ambient.intensity = 0.62 + clear * 0.08;
    this.lights.hemisphere.intensity = 2.38 + (inWave ? 0.08 : 0) + clear * 0.2;
    this.lights.key.intensity = 3.2 + clear * 0.28 + bossPulse * 0.12;
    this.lights.fill.intensity = 1.32 + (inWave ? 0.12 : 0.02);
    this.lights.rim.intensity = 0.86 + bossPulse * 0.34;
    this.lights.nexus.intensity = 1.34 + this.game.nexusPulse * 2.0 + clear * 0.7;
    this.lights.spawn.intensity = 1.18 + (this.game.spawnPulse || 0) * 1.3 + (this.game.spawnCharge || 0) * 0.85;
    this.lights.spawn.position.y = 1.45 + Math.sin(time * 1.8) * 0.04;

    const targetBg = boss ? this._bossColor : inWave ? this._waveColor : this._clearColor;
    this.scene.background.lerp(targetBg, 0.025);
    this.scene.fog.color.lerp(boss ? this._fogBoss : this._fogClear, 0.025);
    this.scene.fog.density = 0.0125 + lateGame * 0.001 + bossPulse * 0.0015;
    this.webgl.toneMappingExposure = 1.42 + clear * 0.05 - bossPulse * 0.025;
  }

  render(dt) {
    this.time += dt;
    this.cameraRig.update(dt);
    if (this.cameraRig.consumeProjectionDirty()) this.updateProjection();
    this.updateLighting(this.time);
    this.env.update(this.time, this.game.buildChoice, this.game.hoverPad, this.game.towers);
    this.battlefield.update(this.time);
    this.towerArt.sync(this.time);
    this.enemyArt.sync(this.time);
    this.vfx.sync(this.time);
    this.syncDebug();
    this.webgl.render(this.scene, this.camera);
  }

  getDebugStats() {
    const info = this.webgl.info;
    let meshes = 0;
    let lights = 0;
    if (this.game.debug) {
      this.scene.traverse((node) => {
        if (node.isMesh || node.isPoints || node.isLine) meshes += 1;
        if (node.isLight) lights += 1;
      });
    }
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      meshes,
      lights,
      camera: this.cameraRig.debug(),
    };
  }

  syncDebug() {
    if (!this.game.debug) {
      if (this.debugRoot) this.debugRoot.visible = false;
      return;
    }
    if (!this.debugRoot) this.buildDebug();
    this.debugRoot.visible = true;
  }

  buildDebug() {
    const root = new THREE.Group();
    const points = PATH.map((point) => toScene(point.x, point.y, 0.19));
    const path = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.9, depthWrite: false }),
    );
    root.add(path);
    for (const pad of BUILD_PADS) {
      const r = pad.r * 0.01;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.012, r + 0.012, 36),
        new THREE.MeshBasicMaterial({ color: '#6effc0', transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(toScene(pad.x, pad.y, 0.18));
      root.add(ring);
    }
    this.scene.add(root);
    this.debugRoot = root;
  }

  destroy() {
    this.resizeObserver.disconnect();
    if (this.debugRoot) disposeObject(this.debugRoot);
    this.webgl.dispose();
  }
}
