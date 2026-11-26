import { clsx } from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsoleTrajectories } from '../api/consoleClient';
import type { AnnotationCategory, ComparedRun, StepAnnotation, TrajectoryStep } from '../api/types';
import { useLocale } from '../i18n/localeContext';
import { dateTimeOf } from '../i18n/locales';
import { ToggleChip } from '../ui/controls';
import { Hint } from '../ui/hint';
import { detailAnchorOf, mostSevere, segmentsOf, type DetailProps, type OverviewProps } from './comparison';
import { AtifFields, AtifStepSummary } from './AtifStep';
import { BlockHead, Cell, ItemRow } from './ComparisonTable';
import timeline from './RunTimeline.module.css';
import styles from './AnnotatedTrajectory.module.css';

/*
 * The trajectory block of a comparison. The overview shows each run's steps as a row of marks with the steps annotators
 * labelled flagged beneath; the detail lays the opened runs' steps side by side, a row per submission, every step one
 * line that opens to its record, the labelled ones highlighted with their reasons in hints.
 */

export function TrajectoryOverview({ comparison, onOpen }: OverviewProps) {
  const { t } = useTranslation();
  const { runs, categories } = comparison;
  return (
    <BlockHead title={t('console.task.compare.blocks.trajectory.title')} hint={t('console.task.compare.blocks.trajectory.hint')}>
      {runs.map(run => {
        const byStep = Map.groupBy(run.annotations, annotation => annotation.step);
        return (
          <Cell key={run.id}>
            <Hint content={t('console.task.compare.openTrajectory')}>
              <button type="button" className={styles.strip} aria-label={t('console.task.compare.openTrajectory')} onClick={() => onOpen(run.id)}>
                <span className={timeline.timeline}>{run.timeline.map(step => <span key={step.stepId} className={clsx(timeline.mark, timeline[step.mark])} />)}</span>
                <span className={clsx(timeline.timeline, styles.flags)}>
                  {run.timeline.map(step => <span key={step.stepId} className={clsx(timeline.mark, styles.flag)} data-severity={mostSevere(categories, byStep.get(step.stepId) ?? [])} />)}
                </span>
              </button>
            </Hint>
            <span className={styles.counts}>
              <span className="t-small c-muted">{t('console.task.compare.steps', { count: run.metrics.steps })}</span>
              {categories.map(category => {
                const count = run.annotations.filter(annotation => annotation.category === category.id).length;
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

/** The opened runs' whole trajectories side by side, a row per submission, filtered to the labels chosen. */
export function TrajectoryDetail({ comparison, opened, labels, onLabel }: DetailProps) {
  const { t } = useTranslation();
  const { categories } = comparison;
  const trajectories = useConsoleTrajectories(opened.map(run => run.id));
  const segments = opened.map((run, index) => segmentsOf(trajectories[index].steps, run));
  const rows = Math.max(...segments.map(runSegments => runSegments.length));
  const filter = categories.length > 0 && (
    <span className={styles.filter} role="group" aria-label={t('console.task.compare.labels')}>
      {categories.map(category => (
        <ToggleChip key={category.id} pressed={labels.includes(category.id)} onToggle={() => onLabel(category.id)}>
          <span className={styles.swatch} data-severity={category.severity} />
          {category.name}
          <span className="t-numeric">{opened.reduce((sum, run) => sum + run.annotations.filter(annotation => annotation.category === category.id).length, 0)}</span>
        </ToggleChip>
      ))}
    </span>
  );
  return (
    <>
      <BlockHead title={t('console.task.compare.blocks.trajectory.title')} hint={t('console.task.compare.blocks.trajectory.hint')} aside={filter} id={detailAnchorOf('trajectory')}>
        {opened.map(run => (
          <Cell key={run.id}>
            <span className="t-small c-muted">{t('console.task.compare.steps', { count: run.metrics.steps })} · {t('console.task.compare.submissions', { count: run.metrics.submissions })}</span>
          </Cell>
        ))}
      </BlockHead>
      {Array.from({ length: rows }, (_, index) => (
        <ItemRow key={index} label={<span className="t-small">{t('console.task.compare.segment', { attempt: index + 1 })}</span>} differs={false}>
          {opened.map((run, runIndex) => {
            const steps = segments[runIndex][index];
            return steps ? <Cell key={run.id}><StepList steps={steps} run={run} categories={categories} labels={labels} /></Cell> : <Cell key={run.id} tone="empty" />;
          })}
        </ItemRow>
      ))}
    </>
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
        ? <StepRow key={item.step.step_id} step={item.step} annotations={byStep.get(item.step.step_id) ?? []} categories={categories} evidence={evidence.has(item.step.step_id)} />
        : <li key={`hidden-${index}`} className={clsx(styles.hidden, 't-micro c-faint')}>{t('console.task.compare.hiddenSteps', { count: item.hidden })}</li>))}
    </ol>
  );
}

/** One step on a line by its own fields; it opens to the step's whole record. */
export function StepRow({ step, annotations, categories, evidence }: { step: TrajectoryStep; annotations: StepAnnotation[]; categories: AnnotationCategory[]; evidence: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <li className={styles.step} data-severity={mostSevere(categories, annotations)}>
      <div className={styles.stepHead}>
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(!open)}>
          <AtifStepSummary step={step} />
        </button>
        {evidence && <span className={styles.evidence}>{t('console.task.compare.evidence')}</span>}
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
