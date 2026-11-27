import { clsx } from 'clsx';
import content from '../../ui/content.module.css';
import { MinusIcon, PlusIcon } from '../../ui/icons';
import styles from './Diff.module.css';

/** A unified diff, each line coloured by whether it adds, removes or locates. */
export function Diff({ lines }: { lines: string[] }) {
  return (
    <pre className={clsx(content.panel, styles.diff, 't-mono')}>
      {lines.map((line, index) => <span key={index} className={line.startsWith('+') ? 'c-ok' : line.startsWith('-') ? 'c-bad' : line.startsWith('@@') ? 'c-faint' : 'c-muted'}>{line}{'\n'}</span>)}
    </pre>
  );
}

/** How many lines a change adds and removes. */
export function ChangeSize({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className={clsx(styles.size, 't-numeric')}>
      <span className="c-ok"><PlusIcon />{additions}</span>
      <span className="c-bad"><MinusIcon />{deletions}</span>
    </span>
  );
}
