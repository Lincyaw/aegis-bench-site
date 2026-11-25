import * as RadixSelect from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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

/** A solid button that submits its form; it waits, faint, while the submission is under way. */
export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <button type="submit" className={clsx(styles.pill, styles.large, styles.solid, 'loop-edge')} disabled={pending} aria-busy={pending}>{children}</button>;
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

/** Copies a text and confirms beside the button, drawing a check, once the text is on the clipboard. */
export function CopyButton({ label, text }: { label: string; text: () => string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <span className={styles.copy}>
      <Button variant="line" onClick={() => void navigator.clipboard.writeText(text()).then(() => setCopied(true))}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></svg>
        {label}
      </Button>
      {copied && (
        <span className={clsx(styles.copied, 't-micro c-ok')} role="status">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" pathLength="1" /></svg>
          {t('ui.copied')}
        </span>
      )}
    </span>
  );
}

/** A round button whose icon turns when hovered; a disabled one stays still and faint. */
export function IconButton({ label, onClick, expanded, disabled, children }: { label: string; onClick: () => void; expanded?: boolean; disabled?: boolean; children: ReactNode }) {
  return <button type="button" className={clsx(styles.pill, styles.icon, !disabled && 'loop-edge')} aria-label={label} aria-expanded={expanded} disabled={disabled} onClick={onClick}>{children}</button>;
}

/** Appends a list's next page; its label says how much is shown, and it waits while the page loads. */
export function MoreButton({ label, loading, onClick, className }: { label: string; loading: boolean; onClick: () => void; className?: string }) {
  return <button type="button" className={clsx(styles.more, 't-micro', className)} disabled={loading} aria-busy={loading} onClick={onClick}>{label}</button>;
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
