import * as THREE from 'three';
import type { Stage } from '../../api/client';
import { REDUCED_MOTION_QUERY } from '../../ui/media';
import { landingElements } from './landingMarkup';
import { LoopScene } from './LoopScene';
import { Palette } from './loopMeshes';
import { ScrollStory } from './scrollStory';
import { Vignette } from './vignetteMotion';

/** How long the window keeps its size before the story is measured again. */
export const RESIZE_SETTLE_MS = 200;

/** three.js draws with WebGL 2; without it the page keeps its copy and leaves out the loop drawn behind it. */
export function supportsWebGL2(): boolean {
  return document.createElement('canvas').getContext('webgl2') !== null;
}

/** The landing page's motion over its rendered markup: the scroll story, the stages' scenes, and the loop drawn behind them. */
export class LandingMotion {
  readonly controller = new AbortController();
  readonly themeObserver = new MutationObserver(() => this.applyTheme());
  readonly palette: Palette;
  readonly story: ScrollStory;
  readonly vignettes: Vignette[];
  readonly scene: LoopScene | null;
  resizeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(root: HTMLElement, stages: Stage[], onCurrentStage: (stage: number | null) => void) {
    const elements = landingElements(root);
    this.palette = new Palette(getComputedStyle(root));
    this.story = new ScrollStory(elements.sections);
    this.vignettes = elements.vignettes.map((card, stage) => new Vignette(card, stage, this.palette.sceneColors()));
    this.scene = supportsWebGL2()
      ? new LoopScene({
          renderer: new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: true, powerPreference: 'high-performance' }),
          elements, stages, story: this.story, vignettes: this.vignettes, palette: this.palette, onCurrentStage,
        })
      : null;
    elements.canvas.hidden = this.scene === null;
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('resize', () => this.resize(), { passive: true, signal: this.controller.signal });
    // The sections change height once the web fonts arrive.
    void document.fonts.ready.then(() => {
      if (!this.controller.signal.aborted) {
        this.remeasure();
      }
    });
  }

  /** The canvas follows the window at once; the story is measured again once the window settles. */
  resize() {
    this.scene?.resizeRenderer();
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.remeasure(), RESIZE_SETTLE_MS);
  }

  remeasure() {
    this.story.rebuild();
    this.scene?.layout();
  }

  /** Colours follow the theme: CSS takes the tokens itself, while the canvas and the scenes' timelines read their values. */
  applyTheme() {
    this.palette.read();
    this.scene?.applyTheme();
    for (const vignette of this.vignettes) {
      vignette.recolor(this.palette.sceneColors());
    }
  }

  scrollToStage(stage: number) {
    this.story.scrollToStage(stage, matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth');
  }

  unmount() {
    this.controller.abort();
    this.themeObserver.disconnect();
    clearTimeout(this.resizeTimer);
    this.story.revert();
    for (const vignette of this.vignettes) {
      vignette.timeline.revert();
    }
    this.scene?.dispose();
  }
}
