import { clsx } from 'clsx';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComparedCheck, RunCheckVerdict, RunFileChange, TaskComparison } from '../../api/types';
import { ToggleChip } from '../../ui/controls';
import controls from '../../ui/controls.module.css';
import { OutcomeText } from '../run/Outcome';
import { Diff } from '../run/RunDetail';
import { numeralOfRun, rowKeyOf, type BlockProps } from './comparison';
import { BlockHead, Cell, ExpansionRow, ItemRow } from './ComparisonTable';
import styles from './ResultBlocks.module.css';

/*
 * The comparison's blocks for what a run produced and how it was graded: the files it changed, its verdict on each
 * check, and its final reply. Each shows its sizes and verdicts first and opens in place to the rest.
 */

export function ChangeSize({ additions, deletions }: { additions: number; deletions: number }) {
  return <span className="t-numeric"><span className="c-ok">+{additions}</span> <span className="c-bad">−{deletions}</span></span>;
}

/** The files the runs changed, as a pull request lists them: each file's size by run, opening in place to every run's diff. */
export function FileChanges({ comparison, expanded, onExpand }: BlockProps) {
  const { t } = useTranslation();
  const { runs, files } = comparison;
  const keys = files.map(file => rowKeyOf('file', file.path));
  const allOpen = keys.length > 0 && keys.every(key => expanded.includes(key));
  const toggleAll = files.length > 1 && (
    <button type="button" className={clsx(controls.textLink, 't-micro')} aria-expanded={allOpen} onClick={() => onExpand(keys)}>
      {allOpen ? t('compare.collapseAll') : t('compare.expandAll')}
    </button>
  );
  return (
    <>
      <BlockHead title={t('compare.blocks.fileChanges.title')} hint={t('compare.blocks.fileChanges.hint')} aside={toggleAll}>
        {runs.map(run => {
          const changes = files.flatMap(file => file.changes.filter(change => change.runId === run.id));
          return (
            <Cell key={run.id}>
              <span className={styles.figures}>
                <ChangeSize additions={changes.reduce((sum, change) => sum + change.additions, 0)} deletions={changes.reduce((sum, change) => sum + change.deletions, 0)} />
                <span className="t-small c-muted">{t('compare.files', { count: changes.length })}</span>
              </span>
            </Cell>
          );
        })}
      </BlockHead>
      {files.map(file => {
        const key = rowKeyOf('file', file.path);
        const open = expanded.includes(key);
        return (
          <Fragment key={file.path}>
            <ItemRow label={<span className={styles.path}>{file.path}</span>} differs={file.differs} expanded={open} onToggle={() => onExpand([key])}>
              {runs.map(run => {
                const change = file.changes.find(candidate => candidate.runId === run.id);
                return change ? (
                  <Cell key={run.id}>
                    <span className={styles.figures}>
                      <ChangeSize additions={change.additions} deletions={change.deletions} />
                      {change.sameAs && <span className={styles.same}>{t('compare.sameAs', { run: numeralOfRun(comparison, change.sameAs) })}</span>}
                    </span>
                  </Cell>
                ) : <Cell key={run.id} tone="empty"><span className="t-small">{t('compare.unchanged')}</span></Cell>;
              })}
            </ItemRow>
            {open && (
              <ExpansionRow>
                {runs.map(run => <ChangeDiff key={run.id} comparison={comparison} change={file.changes.find(candidate => candidate.runId === run.id)} />)}
              </ExpansionRow>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/** A run's diff of a file; a change an earlier run made the same way is not repeated. */
export function ChangeDiff({ comparison, change }: { comparison: TaskComparison; change: RunFileChange | undefined }) {
  const { t } = useTranslation();
  if (!change) {
    return <Cell tone="empty"><span className="t-small">{t('compare.unchanged')}</span></Cell>;
  }
  if (change.sameAs) {
    return <Cell><span className="t-small c-muted">{t('compare.sameDiff', { run: numeralOfRun(comparison, change.sameAs) })}</span></Cell>;
  }
  return <Cell>{change.patch && <Diff lines={change.patch} />}</Cell>;
}

/** A run's verdict on a check; one the run was not graded on says so. */
export function VerdictCell({ verdict }: { verdict: RunCheckVerdict | undefined }) {
  const { t } = useTranslation();
  if (!verdict) {
    return <Cell tone="empty"><span className="t-small">{t('compare.notGraded')}</span></Cell>;
  }
  const outcome = verdict.passed ? 'passed' : 'failed';
  return <Cell tone={verdict.passed ? undefined : 'failed'}><span className="t-small"><OutcomeText outcome={outcome}>{t(`runs.outcome.${outcome}`)}</OutcomeText></span></Cell>;
}

/** What a run produced for a check and why the grading judged it so. */
export function VerdictDetail({ verdict }: { verdict: RunCheckVerdict | undefined }) {
  const { t } = useTranslation();
  if (!verdict) {
    return <Cell tone="empty"><span className="t-small">{t('compare.notGraded')}</span></Cell>;
  }
  return (
    <Cell>
      <div className={styles.said}>
        {verdict.observed && <p>{t('runs.grading.observed', { observed: verdict.observed })}</p>}
        {verdict.detail && <p className="c-muted">{verdict.detail}</p>}
      </div>
    </Cell>
  );
}

export function CheckLabel({ check }: { check: ComparedCheck }) {
  return <span className={styles.check}><span className="t-mono c-faint">{check.id}</span><span className="t-small">{check.title}</span></span>;
}

/**
 * Checks the runs disagree on, or all of them, how many each run passed heading the block; a check opens in place to
 * what each run produced for it, and the failures' reviews follow.
 */
export function Checks({ comparison, expanded, onExpand }: BlockProps) {
  const { t } = useTranslation();
  const { runs, checks } = comparison;
  const [onlyDifferent, setOnlyDifferent] = useState(true);
  const differing = checks.filter(check => check.differs);
  const reviewKey = rowKeyOf('review');
  return (
    <>
      <BlockHead
        title={t('compare.blocks.checks.title')} hint={t('compare.blocks.checks.hint')}
        aside={differing.length > 0 && <ToggleChip pressed={onlyDifferent} onToggle={() => setOnlyDifferent(!onlyDifferent)}>{t('compare.onlyDifferent', { count: differing.length })}</ToggleChip>}
      >
        {runs.map(run => (run.outcome === 'executionFailed'
          ? <Cell key={run.id} tone="empty"><span className="t-small">{t('compare.notGraded')}</span></Cell>
          : <Cell key={run.id}><span className="t-numeric">{run.passCount} / {checks.length}</span></Cell>))}
      </BlockHead>
      {differing.length === 0 && (
        <ItemRow label={<span className="t-small c-muted">{t('compare.allSame')}</span>} differs={false}>
          {runs.map(run => <Cell key={run.id} />)}
        </ItemRow>
      )}
      {(onlyDifferent ? differing : checks).map(check => {
        const key = rowKeyOf('check', check.id);
        const open = expanded.includes(key);
        // Only a check some run produced something for has anything to open to.
        const said = check.verdicts.some(verdict => verdict.observed || verdict.detail);
        return (
          <Fragment key={check.id}>
            <ItemRow label={<CheckLabel check={check} />} differs={check.differs} expanded={open} onToggle={said ? () => onExpand([key]) : undefined}>
              {runs.map(run => <VerdictCell key={run.id} verdict={check.verdicts.find(verdict => verdict.runId === run.id)} />)}
            </ItemRow>
            {open && (
              <ExpansionRow>
                {runs.map(run => <VerdictDetail key={run.id} verdict={check.verdicts.find(verdict => verdict.runId === run.id)} />)}
              </ExpansionRow>
            )}
          </Fragment>
        );
      })}
      {runs.some(run => run.review) && (
        <ItemRow label={<span className="t-small">{t('compare.review')}</span>} differs={false} expanded={expanded.includes(reviewKey)} onToggle={() => onExpand([reviewKey])}>
          {runs.map(run => (
            <Cell key={run.id} tone={run.review ? undefined : 'empty'}>
              {run.review && <p className={clsx(styles.said, !expanded.includes(reviewKey) && styles.clampedShort)}>{run.review.text}</p>}
            </Cell>
          ))}
        </ItemRow>
      )}
    </>
  );
}

/** Each run's final reply, its first lines until asked for the whole. */
export function Reply({ comparison, expanded, onExpand }: BlockProps) {
  const { t } = useTranslation();
  const key = rowKeyOf('reply');
  const open = expanded.includes(key);
  const toggle = (
    <button type="button" className={clsx(controls.textLink, 't-micro')} aria-expanded={open} onClick={() => onExpand([key])}>
      {open ? t('compare.collapseInput') : t('compare.expandInput')}
    </button>
  );
  return (
    <BlockHead title={t('compare.blocks.reply.title')} hint={t('compare.blocks.reply.hint')} aside={toggle}>
      {comparison.runs.map(run => <Cell key={run.id}><p className={clsx(styles.reply, !open && styles.clamped)}>{run.finalReply.text}</p></Cell>)}
    </BlockHead>
  );
}
