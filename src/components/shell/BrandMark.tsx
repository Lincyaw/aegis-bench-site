import { lobePath } from '../lifecycle/loop';
import styles from './BrandMark.module.css';

/** The ∞ mark: the development lobe and the operations lobe. */
export function BrandMark({ width = 38 }: { width?: number }) {
  const height = (width * 17) / 38;
  const a = width / 2 - 1;
  return (
    <svg className={styles.mark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={lobePath('dev', width / 2, height / 2, a, 48)} />
      <path d={lobePath('ops', width / 2, height / 2, a, 48)} />
    </svg>
  );
}
