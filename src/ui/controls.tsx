import * as RadixSelect from '@radix-ui/react-select';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { LocaleLink } from '../i18n/LocaleRouting';
import styles from './controls.module.css';

/** A solid button leads the page forward and carries an arrow; a line button is any other action. */
type ButtonVariant = 'solid' | 'line';

export function ButtonLink({ to, variant, children }: { to: string; variant: ButtonVariant; children: ReactNode }) {
  return <LocaleLink className={clsx(styles.pill, styles.large, variant === 'solid' && styles.solid, 'loop-edge')} to={to}>{children}</LocaleLink>;
}

export function Button({ variant, onClick, children }: { variant: ButtonVariant; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={clsx(styles.pill, styles.large, variant === 'solid' && styles.solid, 'loop-edge')} onClick={onClick}>{children}</button>;
}

/** A round button whose icon turns when hovered. */
export function IconButton({ label, onClick, expanded, children }: { label: string; onClick: () => void; expanded?: boolean; children: ReactNode }) {
  return <button type="button" className={clsx(styles.pill, styles.icon, 'loop-edge')} aria-label={label} aria-expanded={expanded} onClick={onClick}>{children}</button>;
}

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/** A row of mutually exclusive choices inside one track. */
export function SegmentedControl<T extends string>({ label, choices, value, onChange }: { label: string; choices: readonly Choice<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {choices.map(choice => (
        <button key={choice.value} type="button" className={clsx(styles.segment, 'loop-edge')} aria-pressed={choice.value === value} onClick={() => onChange(choice.value)}>{choice.label}</button>
      ))}
    </div>
  );
}

/** A search box; `className` lets the parent place and size it. */
export function SearchField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={clsx(styles.pill, styles.medium, styles.field, className)}>
      <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m9.5 9.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      <input type="search" placeholder={label} aria-label={label} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

export function ChevronIcon() {
  return <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/** A pill that opens a glass list of choices; the chosen one carries a check. `className` lets the parent place it. */
export function Select<T extends string>({ label, choices, value, onChange, className }: { label: string; choices: readonly Choice<T>[]; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <RadixSelect.Root value={value} onValueChange={next => onChange(next as T)}>
      <RadixSelect.Trigger className={clsx(styles.pill, styles.medium, styles.trigger, 'loop-edge', className)} aria-label={label}>
        <RadixSelect.Value />
        <RadixSelect.Icon className={styles.chevron}><ChevronIcon /></RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className={styles.menu} position="popper" sideOffset={6} collisionPadding={12}>
          <RadixSelect.ScrollUpButton className={styles.scroll}><span className={styles.up}><ChevronIcon /></span></RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport className={styles.options}>
            {choices.map(choice => (
              <RadixSelect.Item key={choice.value} value={choice.value} className={clsx(styles.option, 't-small')}>
                <RadixSelect.ItemText>{choice.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className={styles.check}>
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
