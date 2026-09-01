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
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.debugRoot = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#091410');
    this.scene.fog = new THREE.FogExp2('#102019', 0.046);

    this.camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 60);
    this.camera.position.set(10.2, 12.8, 13.4);
    this.camera.lookAt(-0.7, 0, 0.1);

    this.webgl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.08;
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
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.zoom = THREE.MathUtils.clamp(this.zoom * (event.deltaY > 0 ? 0.94 : 1.06), 0.8, 1.28);
      this.resize();
    }, { passive: false });
    this.resize();
  }

  setupLights() {
    const hemisphere = new THREE.HemisphereLight('#cfe8de', '#1b2b22', 1.65);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight('#fff0d2', 2.25);
    key.position.set(-6, 13, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -11;
    key.shadow.camera.right = 11;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 34;
    key.shadow.bias = -0.0007;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight('#8f82ff', 0.65);
    rim.position.set(8, 7, -9);
    this.scene.add(rim);
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
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

  render(dt) {
    this.time += dt;
    this.env.update(this.time, this.game.buildChoice, this.game.hoverPad, this.game.towers);
    this.towerArt.sync(this.time);
    this.enemyArt.sync(this.time);
    this.vfx.sync(this.time);
    this.syncDebug();
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
      new THREE.LineBasicMaterial({ color: '#ffd773', transparent: true, opacity: 0.85, depthWrite: false }),
    );
    root.add(path);
    for (const pad of BUILD_PADS) {
      const r = pad.r * 0.01;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.012, r + 0.012, 36),
        new THREE.MeshBasicMaterial({ color: '#6effc0', transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
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
