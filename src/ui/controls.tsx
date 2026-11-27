import * as RadixSelect from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Locale } from '../i18n/locales';
import { LocaleLink } from '../i18n/LocaleRouting';
import styles from './controls.module.css';
import { Hint } from './hint';
import hint from './hint.module.css';
import { ArrowIcon, CheckIcon, ChevronIcon, CloseIcon, CopyIcon, GoArrowIcon, SearchIcon } from './icons';

// The icons the replay's controls take from here.
export { ArrowIcon, ChevronIcon, FitIcon, FullscreenIcon, ZoomIcon } from './icons';

/**
 * How a control stands in its bar: outlined with the ∞ edge, or quiet, its outline left out, so that the one outlined
 * control of the bar stands out.
 */
export type ControlVariant = 'line' | 'quiet';

/** A solid button leads the page forward and carries an arrow; a line or quiet button is any other action. */
type ButtonVariant = 'solid' | ControlVariant;

/** Large buttons stand in the page; medium ones in a bar of the page. */
type ButtonSize = 'large' | 'medium';

function buttonClass(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return clsx(styles.pill, styles[size], variant === 'solid' && styles.solid, variant === 'quiet' ? styles.quiet : 'loop-edge', className);
}

function ButtonContent({ variant, children }: { variant: ButtonVariant; children: ReactNode }) {
  return <>{children}{variant === 'solid' && <GoArrowIcon />}</>;
}

/**
 * A button that is a link: to a page of the site, in the current language or in the one `locale` names, or to an
 * address that is not a page, such as a file the page makes for download.
 */
export function ButtonLink({ variant, size = 'large', className, children, ...target }: {
  variant: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode;
} & ({ to: string; locale?: Locale } & Pick<ComponentProps<typeof LocaleLink>, 'hrefLang' | 'lang'> | { href: string; download: string })) {
  return 'to' in target
    ? <LocaleLink {...target} className={buttonClass(variant, size, className)}><ButtonContent variant={variant}>{children}</ButtonContent></LocaleLink>
    : <a {...target} className={buttonClass(variant, size, className)}><ButtonContent variant={variant}>{children}</ButtonContent></a>;
}

export function Button({ variant, onClick, children }: { variant: ButtonVariant; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={buttonClass(variant, 'large')} onClick={onClick}><ButtonContent variant={variant}>{children}</ButtonContent></button>;
}

/**
 * A button that submits its form, the one it sits in or the one its form id names; it waits, faint, while the
 * submission is under way.
 */
export function SubmitButton({ variant, pending, form, children }: { variant: ButtonVariant; pending: boolean; form?: string; children: ReactNode }) {
  return (
    <button type="submit" form={form} className={buttonClass(variant, 'large')} disabled={pending} aria-busy={pending}>
      <ButtonContent variant={variant}>{children}</ButtonContent>
    </button>
  );
}

/**
 * A link set in the text of the page, which underlines in the ∞ gradient and sends its arrow ahead as the pointer
 * arrives: to a page of the site, to an address elsewhere (`external` opens it in a new tab), or an action that
 * leads to another part of the page. `className` sets the text style.
 */
export function TextLink({ className, expanded, children, ...target }: {
  className?: string; expanded?: boolean; children: ReactNode;
} & ({ to: string } | { href: string; external?: boolean } | { onClick: () => void })) {
  const content = <>{children}<GoArrowIcon /></>;
  if ('to' in target) {
    return <LocaleLink className={clsx(styles.textLink, className)} to={target.to}>{content}</LocaleLink>;
  }
  if ('href' in target) {
    return <a className={clsx(styles.textLink, className)} href={target.href} target={target.external ? '_blank' : undefined} rel={target.external ? 'noreferrer' : undefined}>{content}</a>;
  }
  return <button type="button" className={clsx(styles.textLink, className)} aria-expanded={expanded} onClick={target.onClick}>{content}</button>;
}

/** A quiet text button that leads back one level of a page, such as from a task's runs to all the tasks. */
export function BackButton({ className, onClick, children }: { className?: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={clsx(styles.back, 't-micro', className)} onClick={onClick}><ArrowIcon direction="left" />{children}</button>;
}

/**
 * A small pill that is a button: it marks the choice it stands for as `pressed`, or as the `current` one of a row, and
 * takes the attributes a trigger of a popover hands it. It stands for one of a few things, such as a run among a
 * task's runs.
 */
export function SmallPill({ pressed, current, className, ...button }: ComponentProps<'button'> & { pressed?: boolean; current?: boolean }) {
  return <button type="button" className={clsx(styles.pill, styles.small, 'loop-edge', className)} aria-pressed={pressed} aria-current={current ? 'true' : undefined} {...button} />;
}

/**
 * A labelled pill field for a line of text; the label sits above it. A field with a pattern has the browser hold back
 * the form until the text matches, and its hint says what matches.
 */
export function TextField({ label, type, autoComplete, value, onChange, pattern }: {
  label: string; type: 'text' | 'password'; autoComplete: string; value: string; onChange: (value: string) => void; pattern?: { regex: string; hint: string };
}) {
  return (
    <label className={styles.textField}>
      <span className="t-micro c-muted">{label}</span>
      <input
        className={clsx(styles.pill, styles.large, styles.input)} type={type} autoComplete={autoComplete} required value={value}
        pattern={pattern?.regex} title={pattern?.hint} onChange={event => onChange(event.target.value)}
      />
      {pattern && <span className="t-micro c-faint">{pattern.hint}</span>}
    </label>
  );
}

/** A labelled field for a few lines of text, which a form needs filled; the label sits above it. */
export function TextArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows: number }) {
  return (
    <label className={styles.textField}>
      <span className="t-micro c-muted">{label}</span>
      <textarea className={styles.area} rows={rows} required value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

/** A pill that is on or off, such as one choice among many that can each be chosen; it carries a check while on. */
export function ToggleChip({ pressed, onToggle, disabled = false, children }: { pressed: boolean; onToggle: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={clsx(styles.pill, styles.medium, styles.chip, 'loop-edge')} aria-pressed={pressed} disabled={disabled} onClick={onToggle}>
      <span className={styles.chipCheck} aria-hidden="true">
        <CheckIcon />
      </span>
      {children}
    </button>
  );
}

/** Copies a text and confirms beside the button, drawing a check, once the text is on the clipboard. */
export function CopyButton({ label, text }: { label: string; text: () => string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <span className={styles.copy}>
      <Button variant="line" onClick={() => void navigator.clipboard.writeText(text()).then(() => setCopied(true))}>
        <CopyIcon />
        {label}
      </Button>
      {copied && (
        <span className={clsx(styles.copied, 't-micro c-ok')} role="status">
          <CheckIcon />
          {t('ui.copied')}
        </span>
      )}
    </span>
  );
}

/** How large a control without words is: the round control of a bar, or a small one beside small pills in a dense row. */
export type IconButtonSize = 'regular' | 'small';

/**
 * A round control whose icon turns when hovered; a disabled one stays still and faint. It runs an action, opens a page
 * of the site, or opens an address elsewhere in a new tab; the trigger of a popover leaves the action to the popover.
 */
export function IconButton({ label, expanded, disabled, variant = 'line', size = 'regular', className: extraClass, children, ...action }: {
  label: string; expanded?: boolean; disabled?: boolean; variant?: ControlVariant; size?: IconButtonSize; className?: string; children: ReactNode;
} & ({ onClick?: () => void } | { to: string } | { href: string })) {
  const quiet = variant === 'quiet';
  const className = clsx(styles.pill, styles.icon, size === 'small' && styles.small, quiet && styles.quiet, !disabled && !quiet && 'loop-edge', extraClass);
  // A hint makes the control its trigger by handing it handlers and a ref as props, which the spread passes on.
  if ('to' in action) {
    return <LocaleLink {...action} className={className} aria-label={label}>{children}</LocaleLink>;
  }
  if ('href' in action) {
    return <a {...action} className={className} target="_blank" rel="noreferrer" aria-label={label}>{children}</a>;
  }
  return <button {...action} type="button" className={className} aria-label={label} aria-expanded={expanded} disabled={disabled}>{children}</button>;
}

/** Appends a list's next page; its label says how much is shown, and it waits while the page loads. */
export function MoreButton({ label, loading, onClick, className }: { label: string; loading: boolean; onClick: () => void; className?: string }) {
  return <button type="button" className={clsx(styles.more, 't-micro', className)} disabled={loading} aria-busy={loading} onClick={onClick}>{label}</button>;
}

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/** A caption over a run of consecutive choices, such as the stage a few benchmarks belong to; `span` counts the choices. */
export interface ChoiceCaption {
  label: ReactNode;
  span: number;
}

/**
 * A row of mutually exclusive choices inside one track, which is the control and carries the ∞ edge. A thumb under the
 * chosen choice slides to the next one chosen. Captions, when given, sit over the runs of choices they name.
 */
export function SegmentedControl<T extends string>({ label, choices, value, onChange, captions }: {
  label: string; choices: readonly Choice<T>[]; value: T; onChange: (value: T) => void; captions?: readonly ChoiceCaption[];
}) {
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const trackElement = track.current;
    if (!trackElement) {
      throw new Error('The segmented control renders its track before its layout effect runs');
    }
    const chosen = trackElement.querySelector<HTMLElement>(`button[value="${CSS.escape(value)}"]`);
    const place = () => setThumb(chosen && { left: chosen.offsetLeft, width: chosen.offsetWidth });
    place();
    // Choices change width when fonts or labels arrive.
    const observer = new ResizeObserver(place);
    trackElement.querySelectorAll('button').forEach(choice => observer.observe(choice));
    return () => observer.disconnect();
  }, [value]);
  const segmented = (
    <div ref={track} className={clsx(styles.segmented, 'loop-edge')} role="group" aria-label={label}>
      {/* The thumb mounts once it has a place, so it appears there instead of sliding in. */}
      {thumb && <span className={styles.thumb} style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }} aria-hidden="true" />}
      {choices.map(choice => (
        <button key={choice.value} type="button" value={choice.value} className={styles.segment} aria-pressed={choice.value === value} onClick={() => onChange(choice.value)}>{choice.label}</button>
      ))}
    </div>
  );
  return captions ? (
    <div className={styles.captioned} style={{ gridTemplateColumns: `repeat(${choices.length}, auto)` }}>
      {captions.map((caption, index) => <span key={index} className={clsx(styles.caption, 't-micro c-faint')} style={{ gridColumn: `span ${caption.span}` }}>{caption.label}</span>)}
      {segmented}
    </div>
  ) : segmented;
}

/** A search box; `className` lets the parent place and size it. */
export function SearchField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={clsx(styles.pill, styles.medium, styles.field, className)}>
      <SearchIcon />
      <input type="search" placeholder={label} aria-label={label} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

/**
 * A pill that opens a glass list of choices; the chosen one carries a check. A quiet one keeps its chevron, so it still
 * reads as a choice to open. `className` lets the parent place it.
 */
export function Select<T extends string>({ label, choices, value, onChange, variant = 'line', className }: {
  label: string; choices: readonly Choice<T>[]; value: T; onChange: (value: T) => void; variant?: ControlVariant; className?: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={next => onChange(next as T)}>
      <RadixSelect.Trigger className={clsx(styles.pill, styles.medium, styles.trigger, variant === 'quiet' ? styles.quiet : 'loop-edge', className)} aria-label={label}>
        <RadixSelect.Value />
        <RadixSelect.Icon className={styles.chevron}><ChevronIcon /></RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className={clsx(hint.popover, styles.menu)} position="popper" sideOffset={6} collisionPadding={12}>
          <RadixSelect.ScrollUpButton className={styles.scroll}><span className={styles.up}><ChevronIcon /></span></RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className={styles.options}>
            {choices.map(choice => (
              <RadixSelect.Item key={choice.value} value={choice.value} className={clsx(styles.option, 't-small')}>
                <RadixSelect.ItemText>{choice.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className={styles.check}>
                  <CheckIcon />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className={styles.scroll}><ChevronIcon /></RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

/**
 * The scope a page keeps to, such as the model the reader came from, named in a small pill whose cross leads back to
 * everything: `to` is the page's address without the scope, and it replaces the current entry in the history.
 */
export function ScopeChip({ name, to }: { name: string; to: string }) {
  const { t } = useTranslation();
  const clear = t('ui.clearScope', { name });
  return (
    <Hint content={clear}>
      <LocaleLink className={clsx(styles.pill, styles.small, styles.scope, 'loop-edge')} aria-label={clear} to={to} replace preventScrollReset>
        {name}<CloseIcon />
      </LocaleLink>
    </Hint>
  );
}
