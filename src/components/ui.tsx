import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Metric, ModelRef, RunOutcome } from '../api/client';
import { lobePath } from './loop';
import styles from './ui.module.css';

/** The ∞ mark: the development lobe and the operations lobe. */
export function Mark({ width = 38 }: { width?: number }) {
  const height = (width * 17) / 38;
  const a = width / 2 - 1;
  return (
    <svg className={styles.mark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={lobePath('dev', width / 2, height / 2, a, 48)} style={{ stroke: 'var(--brand-dev)' }} />
      <path d={lobePath('ops', width / 2, height / 2, a, 48)} style={{ stroke: 'var(--brand-ops)' }} />
    </svg>
  );
}

export function Wordmark() {
  return <span className="t-wordmark">AEGIS <span className="c-faint">BENCH</span></span>;
}

const SLOT_COLOURS: Record<ModelRef['slot'], string> = {
  A: 'var(--series-openai)', B: 'var(--series-anthropic)', C: 'var(--series-google)', D: 'var(--series-moonshot)',
};

export function VendorBadge({ model, size = 20 }: { model: ModelRef; size?: number }) {
  return (
    <span className={styles.vendor} style={{ background: SLOT_COLOURS[model.slot], width: size, height: size, fontSize: size * 0.55 }} title={model.vendor}>
      {model.slot}
    </span>
  );
}

export function ModelName({ model, link = true }: { model: ModelRef; link?: boolean }) {
  const content = <><VendorBadge model={model} /><span>{model.name}</span></>;
  return link ? <Link className={styles.modelName} to={`/models/${model.id}`}>{content}</Link> : <span className={styles.modelName}>{content}</span>;
}

export function Tag({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
  return <span className={`${styles.tag} ${dashed ? styles.dashed : ''} t-micro`}>{children}</span>;
}

type ButtonStyle = 'solid' | 'line';

export function ButtonLink({ to, children, look = 'line' }: { to: string; children: ReactNode; look?: ButtonStyle }) {
  return <Link className={`${styles.button} ${styles[look]} loop-edge`} to={to}>{children}</Link>;
}

export function Button({ children, look = 'line', onClick, label }: { children: ReactNode; look?: ButtonStyle; onClick: () => void; label?: string }) {
  return <button type="button" className={`${styles.button} ${styles[look]} loop-edge`} onClick={onClick} aria-label={label}>{children}</button>;
}

/** The ∞ gradient bar under the selected tab among its siblings; it slides when the selection changes. */
export function TabIndicator({ selected }: { selected: string }) {
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = bar.current;
    const row = element?.parentElement;
    if (!element || !row) {
      throw new Error('TabIndicator needs to sit inside its row of tabs');
    }
    const place = () => {
      const tab = row.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="true"]');
      element.style.opacity = tab ? '1' : '0';
      element.style.width = `${tab?.offsetWidth ?? 0}px`;
      element.style.transform = `translateX(${tab?.offsetLeft ?? 0}px)`;
    };
    place();
    // Tab labels change width when fonts or counts arrive.
    const observer = new ResizeObserver(place);
    Array.from(row.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, [selected]);
  return <span ref={bar} className={styles.indicator} aria-hidden="true" />;
}

export function OutcomeDot({ outcome, size = 7 }: { outcome: RunOutcome; size?: number }) {
  return <span className={`${styles.dot} ${styles[outcome]}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

export const OUTCOME_LABELS: Record<RunOutcome, string> = { passed: '通过', failed: '未通过', executionFailed: '执行失败' };

export function formatScore(score: number, metric: Metric): string {
  return metric.unit === 'percent' ? `${(score * 100).toFixed(1)}%` : score.toFixed(2);
}

/** A horizontal score bar; percent and ratio scores both fill against 1. */
export function ScoreBar({ score, half = 'dev', width = 80 }: { score: number; half?: 'dev' | 'ops'; width?: number }) {
  return (
    <span className={styles.bar} style={{ width }}>
      <span style={{ width: `${Math.min(1, score) * 100}%`, background: half === 'dev' ? 'var(--brand-dev)' : 'var(--brand-ops)' }} />
    </span>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className={`${styles.crumbs} t-small`} aria-label="当前位置">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 && <span className={styles.slash}>/</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page" className="c-main">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function SectionHeading({ id, title, intro }: { id?: string; title: string; intro?: string }) {
  return (
    <header className={styles.sectionHeading} id={id}>
      <h2 className="t-title">{title}</h2>
      {intro && <p className="t-body c-muted">{intro}</p>}
    </header>
  );
}

export function Loading({ label = '正在加载' }: { label?: string }) {
  return <p className={`${styles.state} t-small c-faint`} role="status">{label}…</p>;
}

export function LoadError({ error }: { error: Error }) {
  return <p className={`${styles.state} t-small c-bad`} role="alert">加载失败：{error.message}</p>;
}
