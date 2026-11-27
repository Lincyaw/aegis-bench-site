import { clsx } from 'clsx';
import { Fragment, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnnotationCategory, ComparedRun, StepAnnotation, TaskComparison, TimelineMark, TrajectoryStep } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf } from '../../i18n/locales';
import { ToggleChip } from '../../ui/controls';
import { Hint } from '../../ui/hint';
import { numeralOf, type BlockProps, type ComparisonSource } from '../comparison/comparison';
import { BlockHead, Cell } from '../comparison/ComparisonTable';
import { RunTimeline } from '../run/RunTimeline';
import { AtifFields, AtifStepSummary } from './AtifStep';
import styles from './AnnotatedTrajectory.module.css';
import { mostSevere, segmentsOf } from './steps';

/*
 * The trajectory block of a comparison. Its row shows each run's steps as a row of marks with the steps annotators
 * labelled flagged beneath; a run's marks open its trajectory in the side panel, which lays one or two runs' steps side
 * by side a submission at a time, every step one line that opens to its record, the labelled ones highlighted with
 * their reasons in hints.
 */

export function TrajectoryBlock({ comparison, onTrajectory }: BlockProps) {
  const { t } = useTranslation();
  const { runs, categories } = comparison;
  return (
    <BlockHead title={t('compare.blocks.trajectory.title')} hint={t('compare.blocks.trajectory.hint')}>
      {runs.map(run => {
        const byStep = Map.groupBy(run.annotations, annotation => annotation.step);
        return (
          <Cell key={run.id}>
            <Hint content={t('compare.openTrajectory')}>
              <button type="button" className={styles.strip} aria-label={t('compare.openTrajectory')} onClick={() => onTrajectory(run.id)}>
                <RunTimeline timeline={run.timeline} />
                <span className={styles.flags}>
                  {run.timeline.map(step => <span key={step.stepId} className={styles.flag} data-severity={mostSevere(categories, byStep.get(step.stepId) ?? [])} />)}
                </span>
              </button>
            </Hint>
            <span className={styles.counts}>
              <span className="t-small c-muted">{t('compare.steps', { count: run.metrics.steps })}</span>
              {categories.map((category, index) => {
                const count = run.annotationCounts[index];
                return count > 0 && (
                  <Hint key={category.id} content={<CategoryCard category={category} />}>
                    <button type="button" className={styles.tag} data-severity={category.severity}>{category.name} <span className="t-numeric">{count}</span></button>
                  </Hint>
                );
              })}
            </span>
          </Cell>
        );
      })}
    </BlockHead>
  );
}

export function CategoryCard({ category }: { category: AnnotationCategory }) {
  return (
    <>
      <p className={styles.cardName} data-severity={category.severity}>{category.name}</p>
      <p className="c-muted">{category.description}</p>
    </>
  );
}

/**
 * The trajectories the side panel shows, in the comparison's order, side by side a submission at a time; with labels
 * chosen, only the steps they label.
 */
export function PanelTrajectories({ comparison, shown, labels, onLabel, source }: {
  comparison: TaskComparison; shown: ComparedRun[]; labels: string[]; onLabel: (category: string) => void; source: ComparisonSource;
}) {
  const { t } = useTranslation();
  const { categories } = comparison;
  const trajectories = source.useTrajectories(shown.map(run => run.id));
  const segments = shown.map((run, index) => segmentsOf(trajectories[index].steps, run));
  const rows = Math.max(...segments.map(runSegments => runSegments.length));
  return (
    <div className={styles.panelBody}>
      {categories.length > 0 && (
        <span className={styles.filter} role="group" aria-label={t('compare.labels')}>
          {categories.map((category, index) => (
            <ToggleChip key={category.id} pressed={labels.includes(category.id)} onToggle={() => onLabel(category.id)}>
              <span className={styles.swatch} data-severity={category.severity} />
              {category.name}
              <span className="t-numeric">{shown.reduce((sum, run) => sum + run.annotationCounts[index], 0)}</span>
            </ToggleChip>
          ))}
        </span>
      )}
      <div className={styles.columns} style={{ '--columns': shown.length } as CSSProperties}>
        {shown.map(run => (
          <p key={run.id} className={clsx(styles.columnHead, 't-small')}>
            <span className="t-label">{numeralOf(comparison, run.id)}</span>
            <span>{run.model.name}</span>
            <span className="c-muted">{run.harness.name} · {t('compare.attempt', { attempt: run.attempt })}</span>
            <span className="t-micro c-faint">{t('compare.steps', { count: run.metrics.steps })} · {t('compare.submissions', { count: run.metrics.submissions })}</span>
          </p>
        ))}
        {Array.from({ length: rows }, (_, index) => (
          <Fragment key={index}>
            <h3 className={clsx(styles.segment, 't-micro c-faint')}>{t('compare.segment', { submission: index + 1 })}</h3>
            {shown.map((run, runIndex) => {
              const steps = segments[runIndex][index];
              return <div key={run.id}>{steps && <StepList steps={steps} run={run} categories={categories} labels={labels} />}</div>;
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** Steps in order; with labels chosen, the steps none of them labels fold into a count. */
export function StepList({ steps, run, categories, labels }: { steps: TrajectoryStep[]; run: ComparedRun; categories: AnnotationCategory[]; labels: string[] }) {
  const { t } = useTranslation();
  const byStep = Map.groupBy(run.annotations, annotation => annotation.step);
  const evidence = new Set(run.review?.evidenceSteps ?? []);
  const shown = (step: TrajectoryStep) => labels.length === 0 || (byStep.get(step.step_id) ?? []).some(annotation => labels.includes(annotation.category));
  const items = steps.reduce<({ step: TrajectoryStep } | { hidden: number })[]>((list, step) => {
    const last = list.at(-1);
    return shown(step) ? [...list, { step }] : last && 'hidden' in last ? [...list.slice(0, -1), { hidden: last.hidden + 1 }] : [...list, { hidden: 1 }];
  }, []);
  return (
    <ol className={styles.steps}>
      {items.map((item, index) => ('step' in item
        ? <StepRow key={item.step.step_id} step={item.step} annotations={byStep.get(item.step.step_id) ?? []} categories={categories} evidence={evidence.has(item.step.step_id)} mark={run.timeline.find(entry => entry.stepId === item.step.step_id)?.mark} />
        : <li key={`hidden-${index}`} className={clsx(styles.hidden, 't-micro c-faint')}>{t('compare.hiddenSteps', { count: item.hidden })}</li>))}
    </ol>
  );
}

/** One step on a line by its own fields; it opens to the step's whole record. */
export function StepRow({ step, annotations, categories, evidence, mark }: { step: TrajectoryStep; annotations: StepAnnotation[]; categories: AnnotationCategory[]; evidence: boolean; mark: TimelineMark | undefined }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <li className={styles.step} data-severity={mostSevere(categories, annotations)}>
      <div className={styles.stepHead}>
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(!open)}>
          <AtifStepSummary step={step} mark={mark} />
        </button>
        {evidence && <span className={styles.evidence}>{t('compare.evidence')}</span>}
        {categories.filter(category => annotations.some(annotation => annotation.category === category.id)).map(category => {
          const labelled = annotations.filter(annotation => annotation.category === category.id);
          return (
            <Hint key={category.id} content={<AnnotationCard annotations={labelled} category={category} />}>
              <button type="button" className={styles.tag} data-severity={category.severity}>
                {category.name}{labelled.length > 1 && <span className="t-numeric">{labelled.length}</span>}
              </button>
            </Hint>
          );
        })}
      </div>
      {open && <StepRecord step={step} annotations={annotations} categories={categories} />}
    </li>
  );
}

/** The labels of one category on a step: the category, then each label's reason and who gave it. */
export function AnnotationCard({ annotations, category }: { annotations: StepAnnotation[]; category: AnnotationCategory }) {
  const locale = useLocale();
  return (
    <>
      <p className={styles.cardName} data-severity={category.severity}>{category.name}</p>
      {annotations.map((annotation, index) => (
        <div key={index} className={styles.reason}>
          <p>{annotation.reason}</p>
          <p className="t-micro c-faint">{annotation.annotator} · {dateTimeOf(locale, annotation.annotatedAt)}</p>
        </div>
      ))}
    </>
  );
}

/** A step opened: the labels with their reasons, then every field of the step as the trajectory records it. */
export function StepRecord({ step, annotations, categories }: { step: TrajectoryStep; annotations: StepAnnotation[]; categories: AnnotationCategory[] }) {
  return (
    <div className={styles.record}>
      {categories.filter(category => annotations.some(annotation => annotation.category === category.id)).map(category => (
        <div key={category.id} className={styles.note} data-severity={category.severity}>
          <AnnotationCard annotations={annotations.filter(annotation => annotation.category === category.id)} category={category} />
        </div>
      ))}
      <AtifFields record={step} />
    </div>
  );
}
