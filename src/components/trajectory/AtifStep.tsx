import { clsx } from 'clsx';
import type { TrajectoryStep } from '../../api/types';
import { submissionOf, textOf } from './steps';
import styles from './AtifStep.module.css';

/*
 * A trajectory step as ATIF records it. Its row names it by its own fields, and opened it lists every field under its
 * own name and nested as the record nests it; nothing is renamed or summarised.
 */

/** A step's row: its step_id, source, each tool call's function_name and the first line of its message. */
export function AtifStepSummary({ step }: { step: TrajectoryStep }) {
  const submission = submissionOf(step);
  return (
    <span className={styles.summary}>
      <span className={clsx(styles.id, 't-mono c-faint')}>{step.step_id}</span>
      <span className="t-mono c-muted">{step.source}</span>
      {step.tool_calls?.map(call => (
        <span key={call.tool_call_id} className={clsx(styles.call, submission && (submission.passed ? styles.passed : styles.failed), 't-mono')}>{call.function_name}</span>
      ))}
      <span className={clsx(styles.message, 't-small')}>{textOf(step.message).split('\n')[0]}</span>
    </span>
  );
}

/** Every field of a record under its own name. */
export function AtifFields({ record }: { record: object }) {
  return (
    <dl className={styles.fields}>
      {Object.entries(record).map(([name, value]) => (
        <div key={name} className={styles.field}>
          <dt className="t-mono c-faint">{name}</dt>
          <dd className={styles.value}><AtifValue value={value} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** A field's value: a record's fields, a list's items in order, or the value as written. */
export function AtifValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return <ol className={styles.items}>{value.map((item, index) => <li key={index}><AtifValue value={item} /></li>)}</ol>;
  }
  if (value !== null && typeof value === 'object') {
    return <AtifFields record={value} />;
  }
  return <pre className={styles.scalar}>{typeof value === 'string' ? value : JSON.stringify(value)}</pre>;
}
