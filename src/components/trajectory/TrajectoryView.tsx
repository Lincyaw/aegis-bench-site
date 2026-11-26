import { clsx } from 'clsx';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimelineLegend, TimelineStep, TrajectoryPage } from '../../api/types';
import { TRAJECTORY_PAGE_SIZE, trajectoryPageStartOf } from '../../routes/runRecords';
import { ArrowIcon, IconButton } from '../../ui/controls';
import { Pager } from '../../ui/navigation';
import { RunScrubber, TimelineLegendRow } from '../run/RunTimeline';
import { AtifFields, AtifStepSummary } from './AtifStep';
import styles from './TrajectoryView.module.css';

/**
 * The ATIF trajectory as the run's timeline of marks and a list of its steps a page at a time; selecting either opens
 * that step, every field as the trajectory records it, turning the list to its page.
 */
export function TrajectoryView({ usePage, timeline, legend, evidence, selected, onSelect }: {
  /** Reads one page of the run's trajectory, from the public site's API or the console's */
  usePage: (offset: number, pageSize: number) => TrajectoryPage;

  /** The run's agent steps as the server marked them */
  timeline: TimelineStep[];

  legend: TimelineLegend;

  /** Step ids the failure review relies on; they are marked in the list */
  evidence: number[];

  selected: number | undefined;
  onSelect: (stepId: number | undefined) => void;
}) {
  const { t } = useTranslation();
  // The list turns to the page holding a newly selected step, and stays there when the step closes.
  const [pageStart, setPageStart] = useState(selected === undefined ? 0 : trajectoryPageStartOf(selected));
  const [followed, setFollowed] = useState(selected);
  if (selected !== followed) {
    setFollowed(selected);
    if (selected !== undefined) {
      setPageStart(trajectoryPageStartOf(selected));
    }
  }
  // The page in view stays until the next one arrives.
  const page = usePage(useDeferredValue(pageStart), TRAJECTORY_PAGE_SIZE);
  const firstShown = page.items[0]?.step_id;
  const lastShown = page.items.at(-1)?.step_id;
  const selectedRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, firstShown]);
  const stepIds = timeline.map(step => step.stepId);
  const position = stepIds.indexOf(selected ?? -1);
  const go = (offset: number) => onSelect(stepIds[Math.min(stepIds.length - 1, Math.max(0, (position < 0 ? 0 : position) + offset))]);
  const turnTo = (start: number) => {
    setPageStart(start);
    onSelect(undefined);
  };
  return (
    <div className={styles.view}>
      {timeline.length > 0 && (
        <div className={styles.controls}>
          <IconButton label={t('runs.previousStep')} onClick={() => go(-1)}><ArrowIcon direction="left" /></IconButton>
          <IconButton label={t('runs.nextStep')} onClick={() => go(1)}><ArrowIcon direction="right" /></IconButton>
          <RunScrubber timeline={timeline} current={selected} onSelect={onSelect} />
          <span className="t-micro c-muted">{selected === undefined ? t('runs.stepCount', { count: page.total }) : t('runs.stepOf', { step: selected, count: page.total })}</span>
        </div>
      )}
      <TimelineLegendRow legend={legend} />
      <ol className={styles.steps}>
        {page.items.map(step => {
          const open = step.step_id === selected;
          return (
            <li key={step.step_id} ref={open ? selectedRow : undefined} className={clsx(styles.step, evidence.includes(step.step_id) && styles.evidence)}>
              <button type="button" className={styles.stepHead} onClick={() => onSelect(open ? undefined : step.step_id)} aria-expanded={open}>
                <AtifStepSummary step={step} />
              </button>
              {open && <div className={styles.detail}><AtifFields record={step} /></div>}
            </li>
          );
        })}
      </ol>
      {page.total > TRAJECTORY_PAGE_SIZE && (
        <Pager
          label={t('runs.stepRange', { from: firstShown, to: lastShown, total: page.total })}
          atStart={pageStart === 0} atEnd={pageStart + TRAJECTORY_PAGE_SIZE >= page.total}
          onPrevious={() => turnTo(pageStart - TRAJECTORY_PAGE_SIZE)} onNext={() => turnTo(pageStart + TRAJECTORY_PAGE_SIZE)}
        />
      )}
      <p className="t-micro c-faint">{t('runs.trajectoryNote', { version: page.schema_version, agent: `${page.agent.name} ${page.agent.version}`, model: page.agent.model_name, count: page.final_metrics?.total_steps, cost: page.final_metrics?.total_cost_usd?.toFixed(2) })}</p>
    </div>
  );
}

