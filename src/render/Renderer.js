import * as THREE from 'three';
import { PATH, BUILD_PADS } from '../config/map.js';
import { EnvironmentRenderer } from './EnvironmentRenderer.js';
import { TowerRenderer } from './TowerRenderer.js';
import { EnemyRenderer } from './EnemyRenderer.js';
import { VfxRenderer } from './VfxRenderer.js';
import { toScene, toGame, disposeObject } from './drawing.js';

export class Renderer {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.time = 0;
    this.zoom = 1;
    this.cameraYaw = 0.72;
    this.cameraPitch = 0.72;
    this.cameraDistance = 18;
    this.cameraTarget = new THREE.Vector3(-0.65, 0, 0.15);
    this.cameraShake = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.debugRoot = null;
    this.cameraGesture = null;
    this.ignoreNextClick = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1b392d');
    this.scene.fog = new THREE.FogExp2('#294b3a', 0.018);

    this.camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 80);

    this.webgl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.34;
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLights();
    this.env = new EnvironmentRenderer(game, this.scene);
    this.towerArt = new TowerRenderer(game, this.scene);
    this.enemyArt = new EnemyRenderer(game, this.scene, this.camera);
    this.vfx = new VfxRenderer(game, this.scene, this.camera);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.bindCameraControls();
    this.resize();
    this.updateCamera();
  }

  setupLights() {
    this.lights = {};
    const ambient = new THREE.AmbientLight('#d8ecd9', 0.56);
    const hemisphere = new THREE.HemisphereLight('#f4f7df', '#365b42', 2.25);
    const key = new THREE.DirectionalLight('#fff0cf', 3.05);
    key.position.set(-6.5, 13.5, 7.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -11;
    key.shadow.camera.right = 11;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 36;
    key.shadow.bias = -0.00055;

    const fill = new THREE.DirectionalLight('#a9d9ff', 1.18);
    fill.position.set(7, 8, 4);
    const rim = new THREE.DirectionalLight('#d5b6ff', 0.76);
    rim.position.set(5, 6, -10);

    const spawn = new THREE.PointLight('#7ff2bb', 1.25, 4.4, 2);
    spawn.position.copy(toScene(PATH[0].x, PATH[0].y, 1.45));
    const nexus = new THREE.PointLight('#c78cff', 1.42, 4.8, 2);
    nexus.position.copy(toScene(PATH.at(-1).x, PATH.at(-1).y, 1.6));

    this.scene.add(ambient, hemisphere, key, fill, rim, spawn, nexus);
    Object.assign(this.lights, { ambient, hemisphere, key, fill, rim, spawn, nexus });
  }

  bindCameraControls() {
    const start = (event) => {
      const rotate = event.button === 2 || event.button === 1 || (event.button === 0 && event.altKey) || (event.button === 0 && !event.shiftKey && !this.game.buildChoice && !this.game.hoverPad);
      const pan = event.button === 0 && event.shiftKey;
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
      if (gesture.mode === 'rotate') {
        this.cameraYaw -= dx * 0.0062;
        this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + dy * 0.0048, 0.48, 1.18);
        this.updateCamera();
      } else {
        this.panPixels(dx, dy);
      }
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
      this.zoom = THREE.MathUtils.clamp(this.zoom * (event.deltaY > 0 ? 0.93 : 1.075), 0.72, 1.55);
      this.resize();
    }, { passive: false });
  }

  consumeCameraClick() {
    if (!this.ignoreNextClick) return false;
    this.ignoreNextClick = false;
    return true;
  }

  panPixels(dx, dy) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const unitsPerPixel = (12.2 / this.zoom) / rect.height;
    const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    this.cameraTarget.addScaledVector(right, -dx * unitsPerPixel);
    this.cameraTarget.addScaledVector(forward, -dy * unitsPerPixel);
    this.clampTarget();
    this.updateCamera();
  }

  panCamera(x, z) {
    const step = 0.42 / this.zoom;
    const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    this.cameraTarget.addScaledVector(right, x * step);
    this.cameraTarget.addScaledVector(forward, z * step);
    this.clampTarget();
    this.updateCamera();
  }

  rotateCamera(delta) {
    this.cameraYaw += delta;
    this.updateCamera();
  }

  clampTarget() {
    this.cameraTarget.x = THREE.MathUtils.clamp(this.cameraTarget.x, -4.8, 4.2);
    this.cameraTarget.z = THREE.MathUtils.clamp(this.cameraTarget.z, -2.75, 2.75);
  }

  resetCamera() {
    this.zoom = 1;
    this.cameraYaw = 0.72;
    this.cameraPitch = 0.72;
    this.cameraTarget.set(-0.65, 0, 0.15);
    this.resize();
    this.updateCamera();
  }

  updateCamera() {
    const horizontal = Math.cos(this.cameraPitch) * this.cameraDistance;
    const base = new THREE.Vector3(
      this.cameraTarget.x + Math.sin(this.cameraYaw) * horizontal,
      Math.sin(this.cameraPitch) * this.cameraDistance,
      this.cameraTarget.z + Math.cos(this.cameraYaw) * horizontal,
    );
    this.camera.position.copy(base);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateMatrixWorld();
  }

  kickCamera(power = 0.02) {
    this.cameraShake = Math.min(0.09, this.cameraShake + power);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || window.innerWidth));
    const height = Math.max(240, Math.round(rect.height || window.innerHeight));
    const aspect = width / height;
    const viewHeight = 12.2 / this.zoom;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.updateProjectionMatrix();
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.webgl.setSize(width, height, false);
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
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null;
    return toGame(hit);
  }

  updateLighting(time) {
    const boss = this.game.enemies.some((enemy) => enemy.def.boss && !enemy.dead);
    const inWave = this.game.waveManager.active;
    const clear = this.game.waveClearPulse || 0;
    this.lights.hemisphere.intensity = 2.25 + (inWave ? 0.08 : 0) + clear * 0.22;
    this.lights.key.intensity = 3.05 + (boss ? 0.25 : 0) + clear * 0.35;
    this.lights.fill.intensity = 1.18 + (inWave ? 0.15 : 0);
    this.lights.rim.intensity = 0.76 + (boss ? 0.42 : 0);
    this.lights.nexus.intensity = 1.42 + this.game.nexusPulse * 2.1 + clear * 0.9;
    this.lights.spawn.intensity = 1.25 + (this.game.spawnPulse || 0) * 1.45;
    this.lights.spawn.position.y = 1.45 + Math.sin(time * 1.8) * 0.04;
  }

  render(dt) {
    this.time += dt;
    this.updateLighting(this.time);
    this.env.update(this.time, this.game.buildChoice, this.game.hoverPad, this.game.towers);
    this.towerArt.sync(this.time);
    this.enemyArt.sync(this.time);
    this.vfx.sync(this.time);
    this.syncDebug();
    this.updateCamera();

    if (this.cameraShake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.42;
      this.camera.position.z += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake *= Math.pow(0.08, dt);
    }

    this.webgl.render(this.scene, this.camera);
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
