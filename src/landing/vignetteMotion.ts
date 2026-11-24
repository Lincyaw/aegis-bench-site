import { createTimeline, stagger, svg, type Timeline } from 'animejs';

/** The theme colours a scene animates to; a theme change rebuilds the scene with the new ones. */
export interface SceneColors {
  faint: string;
  ok: string;
  bad: string;
  ops: string;
}

/** The parts of a scene's drawing with a class. */
type SceneParts = (selector: string) => SVGElement[];

/** How long a scene holds its last frame, and how long it then takes to fade before it loops. */
export const SCENE_HOLD = 1500;
export const SCENE_FADE = 320;

/** 01: a spoken request becomes a checklist of acceptable tasks. */
export function requirementsScene(timeline: Timeline, parts: SceneParts) {
  const strokes = svg.createDrawable(parts('.draw'));
  const ticks = svg.createDrawable(parts('.tick'));
  timeline.set(strokes, { draw: '0 0' }, 0).set(ticks, { draw: '0 0' }, 0).set(parts('.row'), { opacity: 0, translateX: -10 }, 0)
    .add(strokes, { draw: ['0 0', '0 1'], duration: 520, delay: stagger(140) }, 100)
    .add(parts('.row'), { opacity: [0, 1], translateX: [-10, 0], duration: 320, delay: stagger(160) }, '-=120')
    .add(ticks, { draw: ['0 0', '0 1'], duration: 260, delay: stagger(240) }, '+=80');
}

/** 02: components appear, get wired together, and a request travels through them. */
export function designScene(timeline: Timeline, parts: SceneParts) {
  const links = svg.createDrawable(parts('.link'));
  const flow = parts('.flow')[0];
  if (!(flow instanceof SVGPathElement)) {
    throw new Error('The design scene has no flow path');
  }
  const motion = svg.createMotionPath(flow);
  timeline.set(parts('.node'), { scale: 0, opacity: 0 }, 0).set(links, { draw: '0 0' }, 0).set(parts('.dot'), { opacity: 0 }, 0)
    .add(parts('.node'), { scale: [0, 1], opacity: [0, 1], duration: 360, delay: stagger(150), ease: 'outBack' }, 100)
    .add(links, { draw: ['0 0', '0 1'], duration: 420, delay: stagger(120) }, '-=100')
    .add(parts('.dot'), { opacity: [0, 1], duration: 120 })
    .add(parts('.dot'), { translateX: motion.translateX, translateY: motion.translateY, duration: 1500, ease: 'inOutSine' });
}

/** 03: code is typed into an editor line by line. */
export function implementationScene(timeline: Timeline, parts: SceneParts) {
  const caret = parts('.caret')[0];
  timeline.set(parts('.code'), { width: 0 }, 0).set(caret, { x: 56, y: 57 }, 0);
  for (const line of parts('.code')) {
    const x = Number(line.getAttribute('x'));
    const y = Number(line.getAttribute('y'));
    const width = Number(line.getAttribute('width'));
    const duration = 120 + width * 2.2;
    timeline.set(caret, { x, y: y - 3 })
      .add(line, { width: [0, width], duration, ease: 'linear' })
      .add(caret, { x: x + width + 4, duration, ease: 'linear' }, '<<');
  }
}

/** 04: a diff marks what changed, a comment is raised, and the change is approved. */
export function reviewScene(timeline: Timeline, parts: SceneParts) {
  const approval = svg.createDrawable(parts('.draw'));
  timeline.set(parts('.drow'), { opacity: 0 }, 0).set(parts('.mark-bg'), { opacity: 0 }, 0).set(parts('.comment'), { scale: 0, opacity: 0 }, 0).set(approval, { draw: '0 0' }, 0)
    .add(parts('.drow'), { opacity: [0, 1], duration: 260, delay: stagger(110) }, 100)
    .add(parts('.mark-bg'), { opacity: [0, 1], duration: 300, delay: stagger(140) })
    .add(parts('.comment'), { scale: [0, 1], opacity: [0, 1], duration: 360, ease: 'outBack' }, '+=200')
    .add(approval, { draw: ['0 0', '0 1'], duration: 420, delay: stagger(160) }, '+=500');
}

/** 05: cases pass one by one; the third fails, is fixed and rerun, and the suite goes green. */
export function testingScene(timeline: Timeline, parts: SceneParts, colors: SceneColors) {
  const rows = parts('.trow');
  const checks = rows.map(row => svg.createDrawable(row.querySelectorAll<SVGPathElement>('.chk'))[0]);
  const statuses = rows.map(row => row.querySelectorAll<SVGElement>('.st'));
  const cross = svg.createDrawable(parts('.cross'));
  const progress = parts('.prog');
  const failing = 2;
  timeline.set(parts('.st'), { stroke: colors.faint }, 0).set(checks, { draw: '0 0' }, 0).set(cross, { draw: '0 0', opacity: 1 }, 0).set(progress, { width: 0 }, 0).set(parts('.rerun'), { opacity: 0 }, 0);
  rows.forEach((_, k) => {
    const passed = k < failing ? k + 1 : k;
    timeline.add(statuses[k], { stroke: k === failing ? colors.bad : colors.ok, duration: 160 })
      .add(k === failing ? cross : checks[k], { draw: ['0 0', '0 1'], duration: 220 }, '<<')
      .add(progress, { width: 60 * passed, duration: 200 }, '<<');
  });
  timeline.add(parts('.rerun'), { opacity: [0, 1], duration: 200 }, '+=300')
    .add(cross, { opacity: [1, 0], duration: 200 }, '+=300')
    .add(statuses[failing], { stroke: colors.ok, duration: 200 }, '<<')
    .add(checks[failing], { draw: ['0 0', '0 1'], duration: 220 })
    .add(progress, { width: 60 * rows.length, duration: 300 }, '<<')
    .add(parts('.rerun'), { opacity: 0, duration: 200 });
}

/** 06: a change moves through build, test, package and deploy. */
export function releaseScene(timeline: Timeline, parts: SceneParts, colors: SceneColors) {
  const stops = parts('.st');
  timeline.set(stops, { stroke: colors.faint }, 0).set(parts('.token'), { translateX: 0 }, 0).set(parts('.done'), { scale: 1, opacity: 0 }, 0)
    .add(stops[0], { stroke: colors.ops, duration: 160 }, 100);
  [84, 168, 252].forEach((dx, k) => timeline.add(parts('.token'), { translateX: dx, duration: 520, ease: 'inOutSine' }, '+=180').add(stops[k + 1], { stroke: colors.ops, duration: 160 }));
  timeline.add(parts('.done'), { scale: [1, 1.9], opacity: [0.9, 0], duration: 700 });
}

/** 07: an incident spikes on the dashboard, raises an alert, and the service recovers. */
export function operationsScene(timeline: Timeline, parts: SceneParts, colors: SceneColors) {
  const signal = svg.createDrawable(parts('.sig'));
  const recovery = svg.createDrawable(parts('.rec'));
  const pulse = { scale: [0.5, 2.4], opacity: [1, 0], duration: 600, ease: 'outQuad' };
  timeline.set(signal, { draw: '0 0' }, 0).set(recovery, { draw: '0 0' }, 0).set(parts('.pulse'), { scale: 0.5, opacity: 0 }, 0).set(parts('.status'), { fill: colors.bad }, 0)
    .set(parts('.alert-text'), { opacity: 1 }, 0).set(parts('.ok-text'), { opacity: 0 }, 0)
    .add(signal, { draw: ['0 0', '0 1'], duration: 1100, ease: 'linear' }, 100)
    .add(parts('.pulse'), { ...pulse })
    .add(parts('.pulse'), { ...pulse })
    .add(recovery, { draw: ['0 0', '0 1'], duration: 1000, ease: 'linear' }, '+=150')
    .add(parts('.status'), { fill: colors.ok, duration: 220 }, '-=200')
    .add(parts('.alert-text'), { opacity: 0, duration: 150 }, '<<')
    .add(parts('.ok-text'), { opacity: 1, duration: 200 });
}

/** 08: scattered modules are refactored into order and the version moves on. */
export function maintenanceScene(timeline: Timeline, parts: SceneParts) {
  const scatter = [[-48, -34, -18], [30, 46, 14], [-14, 52, -8], [52, -40, 22], [-60, 24, 12], [34, 14, -16]];
  parts('.block').forEach((block, k) => timeline.set(block, { translateX: scatter[k][0], translateY: scatter[k][1], rotate: scatter[k][2] }, 0));
  timeline.set(parts('.v-old'), { opacity: 1 }, 0).set(parts('.v-new'), { opacity: 0 }, 0)
    .add(parts('.block'), { translateX: 0, translateY: 0, rotate: 0, duration: 700, delay: stagger(110), ease: 'inOutCubic' }, 400)
    .add(parts('.v-old'), { opacity: 0, duration: 200 }, '+=150')
    .add(parts('.v-new'), { opacity: 1, duration: 250 });
}

/** Each stage's scene, in lifecycle order. */
export const SCENES: ((timeline: Timeline, parts: SceneParts, colors: SceneColors) => void)[] = [
  requirementsScene, designScene, implementationScene, reviewScene, testingScene, releaseScene, operationsScene, maintenanceScene,
];

/** A stage's scene as one looping timeline: the drawing plays out, holds, and fades before it starts again. */
export function sceneTimeline(drawing: SVGSVGElement, stage: number, colors: SceneColors): Timeline {
  const timeline = createTimeline({ autoplay: false, loop: true, playbackRate: 0.7, defaults: { ease: 'outCubic' } });
  timeline.set(drawing, { opacity: 1 }, 0);
  SCENES[stage](timeline, selector => [...drawing.querySelectorAll<SVGElement>(selector)], colors);
  return timeline.add(drawing, { opacity: [1, 0], duration: SCENE_FADE }, `+=${SCENE_HOLD}`);
}

/** A stage's scene card: its scene plays while the reader is at the stage, and rests on its last frame under reduced motion. */
export class Vignette {
  readonly card: HTMLElement;
  readonly stage: number;
  readonly drawing: SVGSVGElement;
  timeline: Timeline;
  playing = false;

  constructor(card: HTMLElement, stage: number, colors: SceneColors) {
    const drawing = card.querySelector('svg');
    if (!drawing) {
      throw new Error(`The scene card of stage ${stage} has no drawing`);
    }
    this.card = card;
    this.stage = stage;
    this.drawing = drawing;
    this.timeline = sceneTimeline(drawing, stage, colors);
  }

  /** The scene's timelines hold colour values, so a theme change builds them again. */
  recolor(colors: SceneColors) {
    this.timeline.revert();
    this.timeline = sceneTimeline(this.drawing, this.stage, colors);
    this.playing = false;
  }

  play(reducedMotion: boolean) {
    if (this.playing) {
      return;
    }
    this.playing = true;
    if (reducedMotion) {
      this.timeline.seek(this.timeline.duration - SCENE_FADE - 20);
    } else {
      this.timeline.restart();
    }
  }

  pause() {
    if (this.playing) {
      this.playing = false;
      this.timeline.pause();
    }
  }
}
