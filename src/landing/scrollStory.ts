import { createTimeline, onScroll, utils, type ScrollObserver, type Timeline } from 'animejs';
import { PART, partsOf } from './landingMarkup';
import { LAP_START, STATION_AT } from './lemniscate';

/** How the camera frames the loop while a section is read. */
export const FRAMINGS = ['smoke', 'map', 'stage', 'far', 'mark'] as const;
export type Framing = (typeof FRAMINGS)[number];

/** A section of the page and how the loop is framed while it is read; a stage's section names its stage. */
export type Beat = { section: HTMLElement; framing: Exclude<Framing, 'stage'> } | { section: HTMLElement; framing: 'stage'; stage: number };

/** The attributes that make a section a beat of the story; beatOf reads them back. */
export function beatAttributes(framing: Exclude<Framing, 'stage'>) {
  return { 'data-part': PART.beat, 'data-framing': framing };
}

export function stageBeatAttributes(stage: number) {
  return { 'data-part': PART.beat, 'data-framing': 'stage', 'data-stage': stage };
}

/** A section's beat, from its data-framing and data-stage attributes. */
export function beatOf(section: HTMLElement): Beat {
  const framing = section.dataset.framing as Framing;
  if (!FRAMINGS.includes(framing)) {
    throw new Error(`no framing ${framing}`);
  }
  return framing === 'stage' ? { section, framing, stage: Number(section.dataset.stage) } : { section, framing };
}

/** Where the agent rests during a beat: at its stage, or one full lap on, at the start again, once the tour is over. */
export function lapAt(beat: Beat): number {
  switch (beat.framing) {
    case 'stage': return STATION_AT[beat.stage];
    case 'far':
    case 'mark': return LAP_START + 1;
    default: return LAP_START;
  }
}

/** Where the story stands: between two beats, and how far it has moved from the first to the second. */
export class StoryFrame {
  readonly from: Beat;
  readonly to: Beat;
  readonly mix: number;

  constructor(from: Beat, to: Beat, mix: number) {
    this.from = from;
    this.to = to;
    this.mix = mix;
  }

  weightOf(framing: Framing): number {
    return (this.from.framing === framing ? 1 - this.mix : 0) + (this.to.framing === framing ? this.mix : 0);
  }

  weightOfStage(stage: number): number {
    const at = (beat: Beat) => beat.framing === 'stage' && beat.stage === stage;
    return (at(this.from) ? 1 - this.mix : 0) + (at(this.to) ? this.mix : 0);
  }
}

/** The story runs from the page's top to its bottom, and eases a little behind the scroll. */
export const SCROLL_SPAN = { target: document.body, enter: 'top top', leave: 'bottom bottom', sync: 0.9 };

export function maxScroll(): number {
  return Math.max(1, document.documentElement.scrollHeight - innerHeight);
}

/**
 * The scroll story: one timeline in scroll pixels, sought by the page's scroll position. It moves the camera from beat
 * to beat, carries the agent round the loop, and fades each section's copy in and out.
 */
export class ScrollStory {
  readonly beats: Beat[];
  /** Where each beat sits in scroll pixels: the first at the top, every other with its section centred in the window. */
  anchors: number[];
  /** The beat the camera is at, fractional between two beats, and how far round the loop the agent is. */
  readonly progress = { beat: 0, lap: LAP_START };
  timeline: Timeline;
  observer: ScrollObserver;

  constructor(sections: HTMLElement[]) {
    this.beats = sections.map(beatOf);
    this.anchors = this.measure();
    this.timeline = this.storyTimeline();
    this.observer = onScroll(SCROLL_SPAN).link(this.timeline);
  }

  measure(): number[] {
    const max = maxScroll();
    return this.beats.map(({ section }, k) => (k === 0 ? 0 : Math.min(max, Math.max(0, section.getBoundingClientRect().top + scrollY + section.offsetHeight / 2 - innerHeight / 2))));
  }

  storyTimeline(): Timeline {
    const max = maxScroll();
    this.progress.beat = 0;
    this.progress.lap = LAP_START;
    const story = createTimeline({ autoplay: false, defaults: { ease: 'inOutSine' } });
    for (let k = 0; k < this.beats.length - 1; k++) {
      const from = this.anchors[k];
      const span = this.anchors[k + 1] - from;
      if (span > 0) {
        story.add(this.progress, { beat: [k, k + 1], lap: [lapAt(this.beats[k]), lapAt(this.beats[k + 1])], duration: span * 0.72 }, from + span * 0.14);
      }
    }
    this.beats.forEach((beat, k) => this.addFades(story, beat, k, max));
    // The timeline spans the whole page, so that a scroll position is a time in it.
    return story.add({ end: 0 }, { end: 1, duration: 1 }, max - 1);
  }

  /** A section's copy fades in as it arrives and out as it leaves; its leaderboards draw their bars once it is in. */
  addFades(story: Timeline, beat: Beat, k: number, max: number) {
    const vh = innerHeight;
    const at = this.anchors[k];
    for (const copy of partsOf(beat.section, PART.copy, HTMLElement)) {
      if (k > 0) {
        utils.set(copy, { opacity: 0, translateY: 28 });
        story.add(copy, { opacity: [0, 1], translateY: [28, 0], duration: vh * 0.3, ease: 'outCubic' }, Math.max(0, at - vh * 0.45));
      }
      story.add(copy, { opacity: [1, 0], translateY: [0, -28], duration: vh * 0.28, ease: 'inCubic' }, Math.min(max - 1, at + vh * 0.3));
    }
    partsOf(beat.section, PART.leaders, HTMLElement).forEach((leaders, n) => {
      utils.set(leaders, { '--reveal': 0 });
      story.add(leaders, { '--reveal': [0, 1], duration: vh * 0.35, ease: 'outCubic' }, Math.max(0, at - vh * 0.3 + n * vh * 0.08));
    });
  }

  /** The sections change height with the window and the fonts, so the story is measured and built again. */
  rebuild() {
    this.revert();
    this.anchors = this.measure();
    this.timeline = this.storyTimeline();
    this.observer = onScroll(SCROLL_SPAN).link(this.timeline);
  }

  frame(): StoryFrame {
    const k = Math.floor(this.progress.beat);
    const last = this.beats.length - 1;
    return new StoryFrame(this.beats[k], this.beats[Math.min(k + 1, last)], this.progress.beat - k);
  }

  scrollToStage(stage: number, behavior: ScrollBehavior) {
    const k = this.beats.findIndex(beat => beat.framing === 'stage' && beat.stage === stage);
    window.scrollTo({ top: this.anchors[k], behavior });
  }

  revert() {
    this.observer.revert();
    this.timeline.revert();
  }
}
