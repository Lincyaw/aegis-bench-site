import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial, type LineMaterialParameters } from 'three/addons/lines/LineMaterial.js';
import { halfValues } from '../../api/schema';
import type { Half, Stage } from '../../api/types';
import { NARROW_QUERY, REDUCED_MOTION_QUERY } from '../../ui/media';
import { PART, partOf, type LandingElements } from './landingMarkup';
import { LAP_START, STATION_AT, loopPoint } from './lemniscate';
import { CHEVRONS, HALF_TOKEN, TOKEN, WAKE, createChevrons, createFloor, createRing, createSmoke, createWake, segmentBuffer, writePolyline, type Palette, type Token } from './loopMeshes';
import type { Beat, ScrollStory, StoryFrame } from './scrollStory';
import type { Vignette } from './vignetteMotion';

/** How finely the loop's line is drawn. */
export const PATH_SEGMENTS = 1200;

/** Directions the camera sees the loop from: low behind the title, higher over the map, from above onto the mark, and close up at a stage. */
export const VIEW = {
  mark: new THREE.Vector3(0, 1, 0.012).normalize(),
  wideSmoke: new THREE.Vector3(0, 0.36, 1).normalize(),
  narrowSmoke: new THREE.Vector3(0, 0.9, 1).normalize(),
  wideMap: new THREE.Vector3(0, 0.62, 1).normalize(),
  narrowMap: new THREE.Vector3(0, 1.15, 0.75).normalize(),
  wideStage: new THREE.Vector3(0.1, 0.55, 1).normalize(),
  narrowStage: new THREE.Vector3(0, 0.9, 0.75).normalize(),
};

export const UP = new THREE.Vector3(0, 1, 0);
/** The agent floats just above the line, a station's label above its dot, and a lobe's label in the middle of its lobe. */
export const AGENT_LIFT = new THREE.Vector3(0, 0.03, 0);
export const LABEL_LIFT = new THREE.Vector3(0, 0.5, 0);
export const LABEL_REACH = new THREE.Vector3(0, 1.1, 0);
export const LOBE_AT: Record<Half, THREE.Vector3> = { dev: new THREE.Vector3(-7.2, 0, 0), ops: new THREE.Vector3(7.2, 0, 0) };

/** Where the camera stands, what it looks at, and how far the picture is shifted on the screen. */
interface CameraPose {
  position: number[];
  target: number[];
  offset: number[];
}

interface ScreenRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The camera poses that fit the loop into the page's free space, measured whenever the layout changes. */
interface Fits {
  mark: CameraPose;
  smoke: CameraPose;
  map: CameraPose;
  /** The mark's slot top on the screen once the page is scrolled to the end */
  markSlotTop: number;
  /** Where a focused stage's station sits on the screen */
  focusPoint: number[];
}

interface Station {
  stage: number;
  half: Half;
  covered: boolean;
  base: THREE.Group;
  /** Turned to face the camera every frame */
  face: THREE.Group;
  /** The ring that keeps spreading from a covered station */
  ripple: Line2 | null;
  label: HTMLElement;
  hotspot: HTMLElement;
}

/** A label, hotspot or scene card answers the pointer, the keyboard and screen readers while it shows, and none of them otherwise. */
export function setReachable(part: HTMLElement, reachable: boolean) {
  part.style.pointerEvents = reachable ? 'auto' : 'none';
  // inert is an attribute, and setting an attribute changes the DOM even to the same value, so it is set only on a change.
  if (part.inert === reachable) {
    part.inert = !reachable;
  }
}

export interface LoopSceneOptions {
  renderer: THREE.WebGLRenderer;
  elements: LandingElements;
  stages: Stage[];
  story: ScrollStory;
  vignettes: Vignette[];
  palette: Palette;
  onCurrentStage: (stage: number | null) => void;
}

/**
 * The loop drawn with three.js behind the page: smoke that condenses into a line, the agent and its wake, the stations
 * and their labels, and the scenes tied to them. The camera follows the scroll story from beat to beat.
 */
export class LoopScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  /** A second camera that only measures where the loop falls on the screen from a trial position */
  readonly probe = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  readonly loop = new THREE.Group();
  readonly agent = new THREE.Group();
  readonly curve = new THREE.CatmullRomCurve3(Array.from({ length: 480 }, (_, k) => loopPoint(k / 480)), true);
  readonly pathPoints = this.curve.getPoints(PATH_SEGMENTS);
  readonly pathGeometry = new LineGeometry();
  /** Fat lines measure their width in pixels, so every line material learns the canvas size */
  readonly lineMaterials: LineMaterial[] = [];
  readonly pathMaterial = this.lineMaterial({ vertexColors: true, linewidth: 2 });
  readonly underlayMaterial = this.lineMaterial({ vertexColors: true, linewidth: 9, opacity: 0.1 });
  /** The chevrons and the wake fade in and out over the smoke, so they must not hide it through the depth buffer */
  readonly chevronMaterial = this.lineMaterial({ vertexColors: true, linewidth: 1.5, depthWrite: false });
  readonly chevrons = createChevrons(this.chevronMaterial);
  readonly wake = createWake(this.lineMaterial({ vertexColors: true, linewidth: 3, depthWrite: false }));
  readonly wakePositions = new Float32Array(WAKE * 3);
  readonly wakeColors = new Float32Array(WAKE * 3);
  readonly inverseLoop = new THREE.Quaternion();
  readonly narrowQuery = matchMedia(NARROW_QUERY);
  readonly reducedQuery = matchMedia(REDUCED_MOTION_QUERY);
  readonly renderer: THREE.WebGLRenderer;
  readonly elements: LandingElements;
  readonly story: ScrollStory;
  readonly vignettes: Vignette[];
  readonly palette: Palette;
  readonly onCurrentStage: (stage: number | null) => void;
  readonly smoke: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly floorMaterial: THREE.PointsMaterial;
  readonly stations: Station[];
  readonly lobes: { el: HTMLElement; at: THREE.Vector3 }[];
  fits: Fits;
  currentStage: number | null = null;
  elapsed = 0;
  lastTime = performance.now();

  constructor(options: LoopSceneOptions) {
    this.renderer = options.renderer;
    this.elements = options.elements;
    this.story = options.story;
    this.vignettes = options.vignettes;
    this.palette = options.palette;
    this.onCurrentStage = options.onCurrentStage;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.background = this.palette.page;
    this.scene.add(this.loop);
    this.pathGeometry.setPositions(this.pathPoints.flatMap(point => [point.x, point.y, point.z]));
    this.smoke = createSmoke(this.palette, this.renderer.getPixelRatio());
    this.floorMaterial = this.palette.tint(new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }), TOKEN.faint);
    this.scene.add(createFloor(this.floorMaterial));
    this.loop.add(new Line2(this.pathGeometry, this.pathMaterial), new Line2(this.pathGeometry, this.underlayMaterial), this.smoke, this.chevrons, this.wake);
    this.stations = options.stages.map((stage, index) => this.addStation(stage, index));
    this.lobes = this.elements.lobes.map((el, k) => ({ el, at: LOBE_AT[halfValues[k]] }));
    this.agent.add(this.dot(0.13, TOKEN.ink), this.ring(0.24, TOKEN.ink, { opacity: 0.6 }));
    this.loop.add(this.agent);
    this.applyTheme();
    this.resizeRenderer();
    this.fits = this.measureFits();
    this.renderer.setAnimationLoop(now => this.render(now));
  }

  lineMaterial(params: LineMaterialParameters): LineMaterial {
    const material = new LineMaterial({ worldUnits: false, transparent: true, ...params });
    this.lineMaterials.push(material);
    return material;
  }

  dot(radius: number, token: Token): THREE.Mesh {
    return new THREE.Mesh(new THREE.CircleGeometry(radius, 48), this.palette.tint(new THREE.MeshBasicMaterial(), token));
  }

  ring(radius: number, token: Token, params: LineMaterialParameters = {}): Line2 {
    return createRing(radius, this.palette.tint(this.lineMaterial({ linewidth: 1.5, ...params }), token));
  }

  addStation(stage: Stage, index: number): Station {
    const base = new THREE.Group();
    base.position.copy(loopPoint(STATION_AT[index] % 1));
    const face = new THREE.Group();
    base.add(face);
    this.loop.add(base);
    const covered = stage.benchmarks.length > 0;
    const token = HALF_TOKEN[stage.half];
    // A covered station is a dot in its half's colour with a ripple spreading from it; one still being built is hollow and dashed.
    const ripple = covered ? this.ring(0.42, token, { opacity: 0 }) : null;
    face.add(...(ripple
      ? [this.dot(0.24, token), this.ring(0.42, token), ripple]
      : [this.dot(0.26, TOKEN.page), this.ring(0.26, TOKEN.faint, { dashed: true, dashSize: 0.07, gapSize: 0.06 })]));
    return { stage: index, half: stage.half, covered, base, face, ripple, label: this.elements.stationLabels[index], hotspot: this.elements.hotspots[index] };
  }

  /** The palette has been read again: the smoke blends for the new page, and the line takes the new colours. */
  applyTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    const material = this.smoke.material;
    material.uniforms.uLight.value = light ? 1 : 0;
    // On the dark page the smoke glows (added light); on the light page it is a haze laid over the paper.
    material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    material.needsUpdate = true;
    this.pathGeometry.setColors(this.pathPoints.flatMap((_, k) => this.palette.halfColor(k / PATH_SEGMENTS).toArray()));
  }

  resizeRenderer() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    for (const material of this.lineMaterials) {
      material.resolution.set(innerWidth, innerHeight);
    }
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  layout() {
    this.fits = this.measureFits();
  }

  turnLoop(angle: number) {
    this.loop.rotation.y = angle;
    this.loop.updateMatrixWorld(true);
  }

  measureFits(): Fits {
    const w = innerWidth;
    const h = innerHeight;
    const narrow = this.narrowQuery.matches;
    // At the end of the page the loop lies flat and settles into the mark's slot.
    this.turnLoop(0);
    const slot = this.elements.markSlot.getBoundingClientRect();
    const markSlotTop = slot.top + scrollY - Math.max(0, document.documentElement.scrollHeight - h);
    const mark = this.fit({ left: slot.left, right: slot.right, top: markSlotTop, bottom: markSlotTop + slot.height }, VIEW.mark, this.loopSamples());
    this.turnLoop(narrow ? -Math.PI / 2 : 0);
    const samples = [...this.loopSamples(), ...this.stations.map(station => this.loop.localToWorld(station.base.position.clone().add(LABEL_REACH)))];
    // Behind the title the loop overflows the screen, so it reads as atmosphere rather than a diagram.
    const smoke = this.fit(narrow ? { left: -0.25 * w, right: 1.25 * w, top: 0.02 * h, bottom: 1.05 * h } : { left: -0.1 * w, right: 1.1 * w, top: 0.12 * h, bottom: 1.02 * h }, narrow ? VIEW.narrowSmoke : VIEW.wideSmoke, samples);
    const side = narrow ? 20 : 96;
    const map = this.fit({ left: side, right: w - side, top: Math.max(110, this.mapCopyBottom() + 56), bottom: h - (narrow ? 24 : 40) }, narrow ? VIEW.narrowMap : VIEW.wideMap, samples);
    // Focused, a station sits in the free column with room for its scene above it.
    const focusPoint = narrow ? [w / 2, h * 0.45] : [Math.min(w - 230, Math.max(w * 0.68, this.stageCopyRight() + 240)), h * 0.78];
    return { mark, smoke, map, markSlotTop, focusPoint };
  }

  loopSamples(): THREE.Vector3[] {
    return Array.from({ length: 96 }, (_, k) => this.loop.localToWorld(loopPoint(k / 96)));
  }

  /** Where the map's copy ends on the screen once the page is scrolled to the map; offsets, as the copy's fade shifts its box. */
  mapCopyBottom(): number {
    const k = this.story.beats.findIndex(beat => beat.framing === 'map');
    const { section } = this.story.beats[k];
    const copy = partOf(section, PART.copy, HTMLElement);
    return section.getBoundingClientRect().top + scrollY + copy.offsetTop - section.offsetTop + copy.offsetHeight - this.story.anchors[k];
  }

  stageCopyRight(): number {
    const beat = this.story.beats.find(candidate => candidate.framing === 'stage');
    if (!beat) {
      throw new Error('The landing page has no stage section');
    }
    const copy = partOf(beat.section, PART.copy, HTMLElement);
    return copy.offsetLeft + copy.offsetWidth;
  }

  /** The pose that fits the samples into a screen rectangle, seen from a fixed direction. */
  fit(rect: ScreenRect, direction: THREE.Vector3, samples: THREE.Vector3[]): CameraPose {
    this.probe.aspect = innerWidth / innerHeight;
    this.probe.updateProjectionMatrix();
    let distance = 40;
    for (let k = 0; k < 4; k++) {
      const box = this.screenBox(samples, direction, distance);
      distance *= Math.max((box.right - box.left) / (rect.right - rect.left), (box.bottom - box.top) / (rect.bottom - rect.top));
    }
    const box = this.screenBox(samples, direction, distance);
    return {
      position: direction.clone().multiplyScalar(distance).toArray(),
      target: [0, 0, 0],
      offset: [(box.left + box.right) / 2 - (rect.left + rect.right) / 2, (box.top + box.bottom) / 2 - (rect.top + rect.bottom) / 2],
    };
  }

  screenBox(samples: THREE.Vector3[], direction: THREE.Vector3, distance: number): ScreenRect {
    this.probe.position.copy(direction).multiplyScalar(distance);
    this.probe.lookAt(0, 0, 0);
    this.probe.updateMatrixWorld();
    const points = samples.map(sample => sample.clone().project(this.probe));
    const xs = points.map(point => (point.x * 0.5 + 0.5) * innerWidth);
    const ys = points.map(point => (-point.y * 0.5 + 0.5) * innerHeight);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }

  poseOf(beat: Beat, narrow: boolean): CameraPose {
    switch (beat.framing) {
      case 'stage': return this.stagePose(beat.stage, narrow);
      case 'map': return this.fits.map;
      // The mark follows its slot as the footer scrolls into place, so it never rests on the copy above.
      case 'mark': return { ...this.fits.mark, offset: [this.fits.mark.offset[0], this.fits.mark.offset[1] - (this.elements.markSlot.getBoundingClientRect().top - this.fits.markSlotTop)] };
      case 'smoke':
      case 'far': return this.fits.smoke;
    }
  }

  /** At a stage the camera keeps facing the loop and only slides and zooms, so the reader always knows where on the loop they are. */
  stagePose(stage: number, narrow: boolean): CameraPose {
    const station = this.stations[stage].base.getWorldPosition(new THREE.Vector3());
    const [x, y] = this.fits.focusPoint;
    return {
      position: station.clone().addScaledVector(narrow ? VIEW.narrowStage : VIEW.wideStage, narrow ? 17 : 15).toArray(),
      target: station.toArray(),
      offset: [innerWidth / 2 - x, innerHeight / 2 - y],
    };
  }

  render(now: number) {
    const reduced = this.reducedQuery.matches;
    if (!reduced) {
      this.elapsed += Math.min(0.05, (now - this.lastTime) / 1000);
    }
    this.lastTime = now;
    const frame = this.story.frame();
    const narrow = this.narrowQuery.matches;
    const markWeight = frame.weightOf('mark');
    // The loop is mist behind the title and again behind the closing sections, and a fine line everywhere else.
    const form = 1 - Math.min(1, frame.weightOf('smoke') + frame.weightOf('far'));
    this.turnLoop(narrow ? (-Math.PI / 2) * (1 - markWeight) : 0);
    this.aimCamera(frame, narrow);
    this.condense(frame, form, markWeight);
    this.driftChevrons();
    this.moveAgent(reduced ? LAP_START : this.story.progress.lap, form, markWeight);
    this.placeStations(frame, form, markWeight);
    this.placeVignettes(frame, narrow, reduced);
    this.shadeVeils(frame);
    this.renderer.render(this.scene, this.camera);
  }

  aimCamera(frame: StoryFrame, narrow: boolean) {
    const from = this.poseOf(frame.from, narrow);
    const to = this.poseOf(frame.to, narrow);
    const mix = (a: number[], b: number[]) => a.map((x, k) => x + (b[k] - x) * frame.mix);
    this.camera.position.fromArray(mix(from.position, to.position));
    this.camera.lookAt(new THREE.Vector3().fromArray(mix(from.target, to.target)));
    const [x, y] = mix(from.offset, to.offset);
    this.camera.setViewOffset(innerWidth, innerHeight, x, y, innerWidth, innerHeight);
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld();
    this.inverseLoop.copy(this.loop.quaternion).invert();
  }

  /** The smoke condenses into the line as the reader leaves the title, and the line hands over to the mark at the end. */
  condense(frame: StoryFrame, form: number, markWeight: number) {
    const { smoothstep } = THREE.MathUtils;
    const ease = form * form * (3 - 2 * form);
    const { uniforms } = this.smoke.material;
    uniforms.uTime.value = this.elapsed;
    // Behind the title the smoke is a pale, nearly neutral mist; it takes on the two halves' colours as it condenses.
    uniforms.uSpread.value = 1.9 * (1 - ease) + 0.04;
    uniforms.uSize.value = 46 * (1 - ease) + 2.2;
    uniforms.uAlpha.value = (frame.weightOf('far') > 0 ? 0.016 : 0.026) * (1 - ease) + 0.14 * ease * (1 - markWeight);
    uniforms.uTint.value = 0.35 + 0.55 * ease;
    this.pathGeometry.instanceCount = Math.floor(smoothstep(form, 0.35, 0.95) * PATH_SEGMENTS);
    // On the way to the footer only faint smoke crosses the copy; the line shows once it is nearly in the mark's place.
    const nearMark = markWeight > 0 ? smoothstep(markWeight, 0.72, 0.9) : 1;
    const handover = smoothstep(markWeight, 0.86, 1);
    const line = smoothstep(form, 0.3, 0.8) * nearMark * (1 - handover);
    this.pathMaterial.opacity = line;
    this.underlayMaterial.opacity = 0.1 * line;
    this.floorMaterial.opacity = 0.32 * line * (1 - markWeight);
    this.chevronMaterial.opacity = 0.85 * line * (1 - markWeight);
    this.elements.mark.style.opacity = handover.toFixed(3);
  }

  /** Chevrons drifting along the loop show which way it runs. */
  driftChevrons() {
    const positions = segmentBuffer(this.chevrons.geometry, 'instanceStart');
    const colors = segmentBuffer(this.chevrons.geometry, 'instanceColorStart');
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (let k = 0; k < CHEVRONS; k++) {
      const s = (k / CHEVRONS + this.elapsed * 0.004) % 1;
      this.curve.getPoint(s, point);
      this.curve.getTangent(s, tangent);
      side.crossVectors(tangent, UP).normalize();
      const tip = point.clone().addScaledVector(tangent, 0.16);
      const left = point.clone().addScaledVector(tangent, -0.1).addScaledVector(side, 0.15);
      const right = point.clone().addScaledVector(tangent, -0.1).addScaledVector(side, -0.15);
      positions.array.set([...left.toArray(), ...tip.toArray(), ...right.toArray(), ...tip.toArray()], k * 12);
      const color = this.palette.halfColor(s).toArray();
      colors.array.set([...color, ...color, ...color, ...color], k * 12);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  /** The agent and its wake: a short stretch of the loop behind it, fading into the page's colour. */
  moveAgent(lap: number, form: number, markWeight: number) {
    const point = new THREE.Vector3();
    for (let k = 0; k < WAKE; k++) {
      const s = (((lap - 0.07 * (1 - k / (WAKE - 1))) % 1) + 1) % 1;
      this.curve.getPoint(s, point);
      this.wakePositions.set([point.x, point.y + 0.02, point.z], k * 3);
      this.wakeColors.set(this.palette.page.clone().lerp(this.palette.ink, (k / (WAKE - 1)) ** 1.6).toArray(), k * 3);
    }
    writePolyline(this.wake.geometry, this.wakePositions, this.wakeColors);
    const shown = form > 0.98 && markWeight < 0.05;
    this.wake.visible = shown;
    this.agent.visible = shown;
    this.curve.getPoint(lap % 1, point);
    this.agent.position.copy(point).add(AGENT_LIFT);
    this.agent.quaternion.copy(this.inverseLoop).multiply(this.camera.quaternion);
  }

  placeStations(frame: StoryFrame, form: number, markWeight: number) {
    const mapWeight = frame.weightOf('map');
    for (const station of this.stations) {
      this.placeStation(station, frame.weightOfStage(station.stage), form, markWeight, mapWeight);
    }
    for (const lobe of this.lobes) {
      this.pin(lobe.el, this.loop.localToWorld(lobe.at.clone()), mapWeight);
    }
    const current = this.stations.find(station => frame.weightOfStage(station.stage) > 0.5)?.stage ?? null;
    if (current !== this.currentStage) {
      this.currentStage = current;
      this.onCurrentStage(current);
    }
  }

  /** A station appears as the loop condenses past it, grows while its stage is read, and its label and hotspot follow it on the screen. */
  placeStation(station: Station, focus: number, form: number, markWeight: number, mapWeight: number) {
    const at = STATION_AT[station.stage] % 1;
    const reached = THREE.MathUtils.smoothstep(form, 0.55 + at * 0.35, 0.65 + at * 0.35);
    station.base.scale.setScalar(reached * (1 + 0.5 * focus) * (1 - markWeight));
    station.face.quaternion.copy(this.inverseLoop).multiply(this.camera.quaternion);
    if (station.ripple) {
      const phase = (this.elapsed * 0.22 + station.stage * 0.23) % 1;
      station.ripple.scale.setScalar(1 + phase * 1.1);
      station.ripple.material.opacity = (1 - phase) * 0.55 * reached;
    }
    const position = station.base.getWorldPosition(new THREE.Vector3());
    this.pin(station.label, position.clone().add(LABEL_LIFT), mapWeight * reached);
    setReachable(station.label, station.covered && mapWeight * reached > 0.5);
    const screen = this.toScreen(position);
    const active = Math.max(mapWeight, focus) * reached;
    station.hotspot.style.transform = `translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px)`;
    station.hotspot.style.opacity = active > 0.3 && screen.inView ? '1' : '0';
    setReachable(station.hotspot, active > 0.5 && screen.inView);
  }

  toScreen(point: THREE.Vector3): { x: number; y: number; inView: boolean } {
    const projected = point.clone().project(this.camera);
    return {
      x: (projected.x * 0.5 + 0.5) * innerWidth,
      y: (-projected.y * 0.5 + 0.5) * innerHeight,
      inView: projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05,
    };
  }

  /** Pins a label's bottom centre to a point in the scene. */
  pin(el: HTMLElement, point: THREE.Vector3, opacity: number) {
    const screen = this.toScreen(point);
    const visible = screen.inView && opacity > 0.02;
    el.style.opacity = visible ? opacity.toFixed(3) : '0';
    if (visible) {
      el.style.transform = `translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  /** The focused stage's scene floats above its station, tied to it by a short dashed line, and plays while it is shown. */
  placeVignettes(frame: StoryFrame, narrow: boolean, reduced: boolean) {
    const { tether } = this.elements;
    tether.style.opacity = '0';
    for (const vignette of this.vignettes) {
      const focus = frame.weightOfStage(vignette.stage);
      const station = this.stations[vignette.stage];
      const screen = this.toScreen(station.base.getWorldPosition(new THREE.Vector3()));
      const box = vignette.card.getBoundingClientRect();
      const left = Math.min(innerWidth - box.width - 16, Math.max(16, screen.x - box.width / 2));
      const top = Math.max(76, screen.y - box.height - (narrow ? 34 : 46));
      vignette.card.style.opacity = (focus * focus).toFixed(3);
      setReachable(vignette.card, focus > 0.5 && station.covered);
      vignette.card.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - focus) * 16).toFixed(1)}px)`;
      if (focus > 0.5) {
        tether.dataset.half = station.half;
        tether.setAttribute('x1', String(screen.x));
        tether.setAttribute('y1', String(screen.y - 14));
        tether.setAttribute('x2', String(screen.x));
        tether.setAttribute('y2', String(top + box.height));
        tether.style.opacity = String((focus - 0.5) * 2);
        vignette.play(reduced);
      } else {
        vignette.pause();
      }
    }
  }

  /** The veils keep the copy readable over the loop: beside the stages, dimmed behind the closing sections, and soft behind the title. */
  shadeVeils(frame: StoryFrame) {
    const { side, dim, hero } = this.elements.veils;
    side.style.opacity = Math.max(0, 1 - frame.weightOf('smoke') - frame.weightOf('map') - frame.weightOf('mark')).toFixed(3);
    dim.style.opacity = (frame.weightOf('far') * 0.25).toFixed(3);
    hero.style.opacity = frame.weightOf('smoke').toFixed(3);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
