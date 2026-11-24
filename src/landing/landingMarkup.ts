/** The parts of the landing page's markup that its motion drives, named by their data-part attribute. */
export const PART = {
  scene: 'scene',
  veilSide: 'veil-side',
  veilDim: 'veil-dim',
  veilHero: 'veil-hero',
  tether: 'tether',
  beat: 'beat',
  stationLabel: 'station-label',
  hotspot: 'hotspot',
  lobe: 'lobe',
  vignette: 'vignette',
  copy: 'copy',
  leaders: 'leaders',
  markSlot: 'mark-slot',
  mark: 'mark',
} as const;

export type PartName = (typeof PART)[keyof typeof PART];

export function partsOf<T extends Element>(root: ParentNode, name: PartName, type: abstract new () => T): T[] {
  return [...root.querySelectorAll(`[data-part="${name}"]`)].map(found => {
    if (!(found instanceof type)) {
      throw new Error(`The landing part ${name} is a ${found.tagName}`);
    }
    return found;
  });
}

export function partOf<T extends Element>(root: ParentNode, name: PartName, type: abstract new () => T): T {
  const [found] = partsOf(root, name, type);
  if (!found) {
    throw new Error(`The landing markup has no ${name}`);
  }
  return found;
}

/** The elements the motion drives. Stations, hotspots and scene cards are in stage order, the lobes in the order of the halves. */
export interface LandingElements {
  canvas: HTMLCanvasElement;
  veils: { side: HTMLElement; dim: HTMLElement; hero: HTMLElement };
  tether: SVGLineElement;
  sections: HTMLElement[];
  stationLabels: HTMLElement[];
  hotspots: HTMLElement[];
  lobes: HTMLElement[];
  vignettes: HTMLElement[];
  markSlot: HTMLElement;
  mark: SVGSVGElement;
}

export function landingElements(root: HTMLElement): LandingElements {
  return {
    canvas: partOf(root, PART.scene, HTMLCanvasElement),
    veils: { side: partOf(root, PART.veilSide, HTMLElement), dim: partOf(root, PART.veilDim, HTMLElement), hero: partOf(root, PART.veilHero, HTMLElement) },
    tether: partOf(root, PART.tether, SVGLineElement),
    sections: partsOf(root, PART.beat, HTMLElement),
    stationLabels: partsOf(root, PART.stationLabel, HTMLElement),
    hotspots: partsOf(root, PART.hotspot, HTMLElement),
    lobes: partsOf(root, PART.lobe, HTMLElement),
    vignettes: partsOf(root, PART.vignette, HTMLElement),
    markSlot: partOf(root, PART.markSlot, HTMLElement),
    mark: partOf(root, PART.mark, SVGSVGElement),
  };
}
