import * as THREE from 'three';
import { WORLD } from '../config/map.js';

export const SCENE_SCALE = 0.01;
export const GROUND_Y = 0.08;

export function toScene(x, y, height = 0) {
  return new THREE.Vector3(
    (x - WORLD.width / 2) * SCENE_SCALE,
    height,
    (y - WORLD.height / 2) * SCENE_SCALE,
  );
}

export function toGame(v) {
  return {
    x: v.x / SCENE_SCALE + WORLD.width / 2,
    y: v.z / SCENE_SCALE + WORLD.height / 2,
  };
}

export function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0.08,
    flatShading: options.flatShading ?? true,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    depthWrite: options.depthWrite ?? true,
    vertexColors: Boolean(options.vertexColors),
    side: options.side ?? THREE.FrontSide,
  });
}

export function emissiveMaterial(color, intensity = 1.5, opacity = 1) {
  return material(color, {
    roughness: 0.38,
    metalness: 0.05,
    emissive: color,
    emissiveIntensity: intensity,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  });
}

export function mesh(geometry, mat, { cast = true, receive = true } = {}) {
  const value = new THREE.Mesh(geometry, mat);
  value.castShadow = cast;
  value.receiveShadow = receive;
  return value;
}

export function cylinder(radiusTop, radiusBottom, height, color, segments = 8, options = {}) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material(color, options));
}

export function box(x, y, z, color, options = {}) {
  return mesh(new THREE.BoxGeometry(x, y, z), material(color, options));
}

export function sphere(radius, color, segments = 12, options = {}) {
  return mesh(new THREE.IcosahedronGeometry(radius, segments > 12 ? 2 : 1), material(color, options));
}

export function crystal(radius, height, color, options = {}) {
  const g = new THREE.ConeGeometry(radius, height, 5);
  return mesh(g, emissiveMaterial(color, options.intensity ?? 0.55, options.opacity ?? 1));
}

export function torus(radius, tube, color, options = {}) {
  return mesh(
    new THREE.TorusGeometry(radius, tube, 8, 32),
    options.emissive === false ? material(color, options) : emissiveMaterial(color, options.intensity ?? 0.85, options.opacity ?? 1),
    { cast: options.cast ?? false, receive: options.receive ?? false },
  );
}

export function markInteractive(root, key, value) {
  root.traverse((node) => {
    if (node.isMesh) node.userData[key] = value;
  });
  return root;
}

export function setShadow(root, cast = true, receive = true) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = cast;
    node.receiveShadow = receive;
  });
  return root;
}

export function disposeObject(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose?.());
    else node.material?.dispose?.();
    if (node.material?.map) node.material.map.dispose?.();
  });
}

export function seeded(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function colorToThree(value) {
  return new THREE.Color(value);
}
