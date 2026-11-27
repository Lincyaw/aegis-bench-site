import type { ReactNode, SVGAttributes } from 'react';

/*
 * The site's line icons: 16px drawings with a 1.4 stroke in the text colour. A small control scales them down with
 * its stylesheet, which scales the stroke with them. The arrows nudge their way and the pictures with a right way up
 * keep it when an icon button turns its icon on hover (see controls.module.css).
 */

export function Icon({ children, ...attributes }: { children: ReactNode } & SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...attributes}>
      {children}
    </svg>
  );
}

/** A chevron for stepping back or forth; in an icon button it nudges its way on hover instead of turning. */
export function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return <Icon data-direction={direction}><path d={direction === 'left' ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'} /></Icon>;
}

/** An arrow with a shaft, which a link or a button that leads on ends with; it moves right when the link is hovered. */
export function GoArrowIcon() {
  return <Icon><path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" /></Icon>;
}

export function ChevronIcon() {
  return <Icon><path d="M3.5 6 8 10.5 12.5 6" /></Icon>;
}

export function CheckIcon() {
  return <Icon><path d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength="1" /></Icon>;
}

export function ThemeIcon() {
  return (
    <Icon>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
    </Icon>
  );
}

export function MenuIcon() {
  return <Icon><path d="M2 4h12M2 8h12M2 12h12" /></Icon>;
}

export function SearchIcon() {
  return <Icon><circle cx="7" cy="7" r="4.75" /><path d="m10.5 10.5 3 3" /></Icon>;
}

export function CopyIcon() {
  return <Icon><rect x="6" y="6" width="8" height="8" rx="1.5" /><path d="M10 6V4.5A1.5 1.5 0 0 0 8.5 3h-4A1.5 1.5 0 0 0 3 4.5v4A1.5 1.5 0 0 0 4.5 10H6" /></Icon>;
}

/** A cross, for closing or taking something out. */
export function CloseIcon() {
  return <Icon><path d="m4 4 8 8M12 4 4 12" /></Icon>;
}

/** A plus, for adding or making larger; in an icon button it keeps upright on hover. */
export function PlusIcon() {
  return <Icon data-upright><path d="M8 3.5v9M3.5 8h9" /></Icon>;
}

/** A minus, for taking away or making smaller; in an icon button it keeps upright on hover. */
export function MinusIcon() {
  return <Icon data-upright><path d="M3.5 8h9" /></Icon>;
}

/** An arrow up and out, for a link to another page; in an icon button it nudges its way on hover. */
export function LinkArrowIcon() {
  return <Icon data-direction="up-right"><path d="M5.5 3.5h7v7M12.5 3.5l-9 9" /></Icon>;
}

/** A page with a folded corner, for a record's files; in an icon button it keeps upright on hover. */
export function FileIcon() {
  return <Icon data-upright><path d="M4 2h5l3 3v9H4zM9 2v3h3" /></Icon>;
}

/** Four corners pointing out, to fill the screen, or in, to leave it; in an icon button they keep upright on hover. */
export function FullscreenIcon({ leave }: { leave: boolean }) {
  return <Icon data-upright><path d={leave ? 'M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4' : 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4'} /></Icon>;
}

/** A plus or a minus, for making something larger or smaller; in an icon button it keeps upright on hover. */
export function ZoomIcon({ direction }: { direction: 'in' | 'out' }) {
  return direction === 'in' ? <PlusIcon /> : <MinusIcon />;
}

/** A square inside four corners, for fitting a drawing to the room it has; in an icon button it keeps upright on hover. */
export function FitIcon() {
  return (
    <Icon data-upright>
      <path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5" />
      <rect x="5.5" y="5.5" width="5" height="5" rx=".75" />
    </Icon>
  );
}

/** A circle around an i, for the small mark that explains what stands next to it. */
export function InfoIcon() {
  return <Icon><circle cx="8" cy="8" r="6.25" /><path d="M8 7.25v3.5M8 5v.1" /></Icon>;
}
