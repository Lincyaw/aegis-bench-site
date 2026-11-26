import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { Half } from '../../api/client';
import { LOOP_RISE, LOOP_SIZE, devShare } from './lemniscate';
import type { SceneColors } from './vignetteMotion';

/** The theme tokens the scene reads; the smoke's mist is the landing page's own. */
export const TOKEN = {
  dev: '--brand-dev',
  ops: '--brand-ops',
  page: '--bg-page',
  ink: '--text-main',
  faint: '--text-faint',
  mist: '--smoke-mist',
  ok: '--accent-success',
  bad: '--accent-warning',
} as const;

export type Token = (typeof TOKEN)[keyof typeof TOKEN];

export const HALF_TOKEN: Record<Half, Token> = { dev: TOKEN.dev, ops: TOKEN.ops };

/** The scene's colours, read from the theme's tokens; a material tinted by a token follows it when the theme changes. */
export class Palette {
  readonly dev = new THREE.Color();
  readonly ops = new THREE.Color();
  readonly page = new THREE.Color();
  readonly ink = new THREE.Color();
  readonly mist = new THREE.Color();
  readonly tinted: [{ color: THREE.Color }, Token][] = [];
  readonly style: CSSStyleDeclaration;

  constructor(style: CSSStyleDeclaration) {
    this.style = style;
    this.read();
  }

  token(token: Token): string {
    return this.style.getPropertyValue(token).trim();
  }

  tint<M extends { color: THREE.Color }>(material: M, token: Token): M {
    material.color.set(this.token(token));
    this.tinted.push([material, token]);
    return material;
  }

  read() {
    this.dev.set(this.token(TOKEN.dev));
    this.ops.set(this.token(TOKEN.ops));
    this.page.set(this.token(TOKEN.page));
    this.ink.set(this.token(TOKEN.ink));
    this.mist.set(this.token(TOKEN.mist));
    for (const [material, token] of this.tinted) {
      material.color.set(this.token(token));
    }
  }

  /** The loop's colour at s: the operations half's, turning into the development half's over the stretch between them. */
  halfColor(s: number): THREE.Color {
    return this.ops.clone().lerp(this.dev, devShare(s));
  }

  sceneColors(): SceneColors {
    return { faint: this.token(TOKEN.faint), ok: this.token(TOKEN.ok), bad: this.token(TOKEN.bad), ops: this.token(TOKEN.ops) };
  }
}

export const SMOKE_COUNT = 9000;

/** Smoke: soft points that stream along the loop. Their spread, size and opacity take them from a drifting cloud to a fine line. */
export const SMOKE_SHADER = {
  vertexShader: `attribute float aS; attribute vec3 aRand; attribute float aSeed;
    uniform float uTime; uniform float uSpread; uniform float uSize; uniform float uPixelRatio;
    uniform vec3 uDev; uniform vec3 uOps; uniform vec3 uMist; uniform float uTint;
    varying vec3 vColor;
    vec3 lemniscate(float s) { float t = s * 6.2831853; float d = 1.0 + sin(t) * sin(t);
      return vec3(${LOOP_SIZE.toFixed(1)} * cos(t) / d, ${LOOP_RISE.toFixed(2)} * sin(t), ${LOOP_SIZE.toFixed(1)} * sin(t) * cos(t) / d); }
    void main() {
      float s = fract(aS + uTime * 0.0024 * (0.6 + 0.8 * aSeed));
      vec3 p = lemniscate(s);
      float a = uTime * (0.1 + aSeed * 0.18) + aSeed * 6.2831853;
      vec3 off = vec3(aRand.x * cos(a) - aRand.z * sin(a), aRand.y, aRand.x * sin(a) + aRand.z * cos(a));
      off += 0.7 * vec3(sin(s * 31.0 + uTime * 0.24 + aSeed * 9.0), 0.5 * sin(s * 23.0 + uTime * 0.16), cos(s * 27.0 + uTime * 0.2 + aSeed * 5.0));
      p += off * uSpread * (0.35 + 0.65 * aSeed);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (30.0 / -mv.z);
      float dev = smoothstep(0.2, 0.3, s) * (1.0 - smoothstep(0.7, 0.8, s));
      vColor = mix(uMist, mix(uOps, uDev, dev), uTint);
    }`,
  // On the dark page the smoke glows (added light); on the light page it is a soft haze laid over the paper.
  fragmentShader: `uniform float uAlpha; uniform float uLight; varying vec3 vColor;
    void main() { float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, r); float k = a * a * uAlpha;
      gl_FragColor = uLight > 0.5 ? vec4(vColor, min(1.0, k * 1.3)) : vec4(vColor * k, 1.0); }`,
};

/** A repeatable stream of numbers in [0, 1), so the smoke drifts the same way on every visit. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

export function createSmoke(palette: Palette, pixelRatio: number): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const random = seededRandom(7);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SMOKE_COUNT * 3), 3));
  geometry.setAttribute('aS', new THREE.Float32BufferAttribute(Float32Array.from({ length: SMOKE_COUNT }, random), 1));
  geometry.setAttribute('aRand', new THREE.Float32BufferAttribute(Float32Array.from({ length: SMOKE_COUNT * 3 }, () => random() * 2 - 1), 3));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(Float32Array.from({ length: SMOKE_COUNT }, random), 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSpread: { value: 3 }, uSize: { value: 50 }, uAlpha: { value: 0.05 }, uPixelRatio: { value: pixelRatio },
      uDev: { value: palette.dev }, uOps: { value: palette.ops }, uMist: { value: palette.mist }, uTint: { value: 0.35 }, uLight: { value: 0 },
    },
    ...SMOKE_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const smoke = new THREE.Points(geometry, material);
  smoke.frustumCulled = false;
  return smoke;
}

/** A grid of faint dots under the loop, so the loop reads as lying in space. */
export function createFloor(material: THREE.PointsMaterial): THREE.Points {
  const dots: number[] = [];
  for (let x = -26; x <= 26; x += 1.3) {
    for (let z = -16; z <= 16; z += 1.3) {
      dots.push(x, -0.9, z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  return new THREE.Points(geometry, material);
}

/** How many chevrons drift along the loop, and how many points the agent's wake has. */
export const CHEVRONS = 26;
export const WAKE = 48;

export function createChevrons(material: LineMaterial): LineSegments2 {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(new Float32Array(CHEVRONS * 12));
  geometry.setColors(new Float32Array(CHEVRONS * 12));
  return new LineSegments2(geometry, material);
}

export function createWake(material: LineMaterial): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(WAKE * 3));
  geometry.setColors(new Float32Array(WAKE * 3));
  return new Line2(geometry, material);
}

export function createRing(radius: number, material: LineMaterial): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions(Array.from({ length: 65 }, (_, k) => {
    const a = (k / 64) * Math.PI * 2;
    return [Math.cos(a) * radius, Math.sin(a) * radius, 0];
  }).flat());
  const ring = new Line2(geometry, material);
  ring.computeLineDistances();
  return ring;
}

/** The interleaved buffer behind a fat line's segment starts or colours, which its ends share. */
export function segmentBuffer(geometry: LineSegmentsGeometry, attribute: 'instanceStart' | 'instanceColorStart'): THREE.InterleavedBuffer {
  const start = geometry.attributes[attribute];
  if (!(start instanceof THREE.InterleavedBufferAttribute)) {
    throw new Error(`The line has no interleaved ${attribute}`);
  }
  return start.data;
}

/** Writes a polyline's points and colours into a fat line as consecutive segments. */
export function writePolyline(geometry: LineGeometry, positions: Float32Array, colors: Float32Array) {
  for (const [source, target] of [[positions, segmentBuffer(geometry, 'instanceStart')], [colors, segmentBuffer(geometry, 'instanceColorStart')]] as const) {
    for (let k = 0; k < source.length / 3 - 1; k++) {
      target.array.set(source.subarray(k * 3, k * 3 + 6), k * 6);
    }
    target.needsUpdate = true;
  }
}
