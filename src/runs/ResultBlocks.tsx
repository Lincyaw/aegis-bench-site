import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComparedCheck, RunCheckVerdict, RunFileChange } from '../api/types';
import { FailureClassTag } from '../results/FailureClassTag';
import { ToggleChip } from '../ui/controls';
import { Hint } from '../ui/hint';
import { numeralOfRun, type BlockProps, type DetailProps } from './comparison';
import { BlockHead, Cell, ItemRow } from './ComparisonTable';
import { OutcomeText } from './Outcome';
import { Diff } from './RunDetailPanel';
import styles from './ResultBlocks.module.css';

/*
 * The comparison's blocks for what a run produced and how it was graded: the files it changed, its verdict on each
 * check, and its final reply.
 */

export function ChangeSize({ additions, deletions }: { additions: number; deletions: number }) {
  return <span className="t-numeric"><span className="c-ok">+{additions}</span> <span className="c-bad">−{deletions}</span></span>;
}

export function FileChangesOverview({ comparison }: BlockProps) {
  const { t } = useTranslation();
  const { runs, files } = comparison;
  return (
    <>
      <BlockHead title={t('console.task.compare.blocks.fileChanges.title')} hint={t('console.task.compare.blocks.fileChanges.hint')}>
        {runs.map(run => {
          const changes = files.flatMap(file => file.changes.filter(change => change.runId === run.id));
          return (
            <Cell key={run.id}>
              <span className={styles.figures}>
                <ChangeSize additions={changes.reduce((sum, change) => sum + change.additions, 0)} deletions={changes.reduce((sum, change) => sum + change.deletions, 0)} />
                <span className="t-small c-muted">{t('console.task.compare.files', { count: changes.length })}</span>
              </span>
            </Cell>
          );
        })}
      </BlockHead>
      {files.map(file => (
        <ItemRow key={file.path} label={<span className={styles.path}>{file.path}</span>} differs={file.differs}>
          {runs.map(run => {
            const change = file.changes.find(candidate => candidate.runId === run.id);
            return change ? (
              <Cell key={run.id}>
                <span className={styles.figures}>
                  <ChangeSize additions={change.additions} deletions={change.deletions} />
                  {change.sameAs && <span className={styles.same}>{t('console.task.compare.sameAs', { run: numeralOfRun(comparison, change.sameAs) })}</span>}
                </span>
              </Cell>
            ) : <Cell key={run.id} tone="empty"><span className="t-small">{t('console.task.compare.unchanged')}</span></Cell>;
          })}
        </ItemRow>
      ))}
    </>
  );
}

/** Each opened run's change to each file, whole; a change the other opened run made the same way is not repeated. */
export function FileChangesDetail({ comparison, opened }: DetailProps) {
  const { t } = useTranslation();
  const openedIds = opened.map(run => run.id);
  const sameOpened = (change: RunFileChange) => change.sameAs !== undefined && openedIds.includes(change.sameAs);
  return (
    <>
      <BlockHead title={t('console.task.compare.blocks.fileChanges.title')} hint={t('console.task.compare.blocks.fileChanges.hint')}>
        {opened.map(run => <Cell key={run.id} />)}
      </BlockHead>
      {comparison.files.filter(file => file.changes.some(change => openedIds.includes(change.runId))).map(file => (
        <ItemRow key={file.path} label={<span className={styles.path}>{file.path}</span>} differs={file.differs}>
          {opened.map(run => {
            const change = file.changes.find(candidate => candidate.runId === run.id);
            if (!change) {
              return <Cell key={run.id} tone="empty"><span className="t-small">{t('console.task.compare.unchanged')}</span></Cell>;
            }
            return (
              <Cell key={run.id}>
                <span className={styles.figures}>
                  <ChangeSize additions={change.additions} deletions={change.deletions} />
                  {change.sameAs && <span className={styles.same}>{t('console.task.compare.sameAs', { run: numeralOfRun(comparison, change.sameAs) })}</span>}
                </span>
                {change.patch && !sameOpened(change) && <Diff lines={change.patch} />}
              </Cell>
            );
          })}
        </ItemRow>
      ))}
    </>
  );
}

/** A run's verdict on a check; a failed one keeps what the run produced behind a hint. */
export function VerdictCell({ verdict }: { verdict: RunCheckVerdict | undefined }) {
  const { t } = useTranslation();
  if (!verdict) {
    return <Cell tone="empty"><span className="t-small">{t('console.task.compare.notGraded')}</span></Cell>;
  }
  const outcome = verdict.passed ? 'passed' : 'failed';
  const text = <span className="t-small"><OutcomeText outcome={outcome}>{t(`runs.outcome.${outcome}`)}</OutcomeText></span>;
  const said = verdict.observed ?? verdict.detail;
  return (
    <Cell tone={verdict.passed ? undefined : 'failed'}>
      {said ? <Hint content={<VerdictCard verdict={verdict} />}><button type="button" className={styles.verdict}>{text}</button></Hint> : text}
    </Cell>
  );
}

/** What a run produced for a check it failed and why the grading failed it. */
export function VerdictCard({ verdict }: { verdict: RunCheckVerdict }) {
  const { t } = useTranslation();
  return (
    <>
      {verdict.observed && <p>{t('runs.grading.observed', { observed: verdict.observed })}</p>}
      {verdict.detail && <p className="c-muted">{verdict.detail}</p>}
    </>
  );
}

export function CheckLabel({ check }: { check: ComparedCheck }) {
  return <span className={styles.check}><span className="t-mono c-faint">{check.id}</span><span className="t-small">{check.title}</span></span>;
}

/** Checks the runs disagree on, or all of them; how many each run passed heads the block. */
export function ChecksOverview({ comparison }: BlockProps) {
  const { t } = useTranslation();
  const { runs, checks } = comparison;
  const [onlyDifferent, setOnlyDifferent] = useState(true);
  const differing = checks.filter(check => check.differs);
  return (
    <>
      <BlockHead
        title={t('console.task.compare.blocks.checks.title')} hint={t('console.task.compare.blocks.checks.hint')}
        aside={differing.length > 0 && <ToggleChip pressed={onlyDifferent} onToggle={() => setOnlyDifferent(!onlyDifferent)}>{t('console.task.compare.onlyDifferent', { count: differing.length })}</ToggleChip>}
      >
        {runs.map(run => (run.outcome === 'executionFailed'
          ? <Cell key={run.id} tone="empty"><span className="t-small">{t('console.task.compare.notGraded')}</span></Cell>
          : <Cell key={run.id}><span className="t-numeric">{run.passCount} / {checks.length}</span></Cell>))}
      </BlockHead>
      {differing.length === 0 && (
        <ItemRow label={<span className="t-small c-muted">{t('console.task.compare.allSame')}</span>} differs={false}>
          {runs.map(run => <Cell key={run.id} />)}
        </ItemRow>
      )}
      {(onlyDifferent ? differing : checks).map(check => (
        <ItemRow key={check.id} label={<CheckLabel check={check} />} differs={check.differs}>
          {runs.map(run => <VerdictCell key={run.id} verdict={check.verdicts.find(verdict => verdict.runId === run.id)} />)}
        </ItemRow>
      ))}
    </>
  );
}

/** Every check with what each opened run produced for it, then the human review of the failed ones. */
export function ChecksDetail({ comparison, opened }: DetailProps) {
  const { t } = useTranslation();
  return (
    <>
      <BlockHead title={t('console.task.compare.blocks.checks.title')} hint={t('console.task.compare.blocks.checks.hint')}>
        {opened.map(run => <Cell key={run.id} />)}
      </BlockHead>
      {comparison.checks.map(check => (
        <ItemRow key={check.id} label={<CheckLabel check={check} />} differs={check.differs}>
          {opened.map(run => {
            const verdict = check.verdicts.find(candidate => candidate.runId === run.id);
            if (!verdict) {
              return <Cell key={run.id} tone="empty"><span className="t-small">{t('console.task.compare.notGraded')}</span></Cell>;
            }
            const outcome = verdict.passed ? 'passed' : 'failed';
            return (
              <Cell key={run.id} tone={verdict.passed ? undefined : 'failed'}>
                <span className="t-small"><OutcomeText outcome={outcome}>{t(`runs.outcome.${outcome}`)}</OutcomeText></span>
                <div className={styles.said}><VerdictCard verdict={verdict} /></div>
              </Cell>
            );
          })}
        </ItemRow>
      ))}
      {opened.some(run => run.outcome === 'failed') && (
        <ItemRow label={<span className="t-small">{t('console.task.compare.review')}</span>} differs={false}>
          {opened.map(run => (
            <Cell key={run.id} tone={run.outcome === 'failed' ? undefined : 'empty'}>
              {run.outcome === 'failed' && <FailureClassTag failureClass={run.failureClass} />}
              {run.review && <p className={styles.said}>{run.review.text}</p>}
            </Cell>
          ))}
        </ItemRow>
      )}
    </>
  );
}

export function ReplyOverview({ comparison }: BlockProps) {
  const { t } = useTranslation();
  return (
    <BlockHead title={t('console.task.compare.blocks.reply.title')} hint={t('console.task.compare.blocks.reply.hint')}>
      {comparison.runs.map(run => <Cell key={run.id}><p className={styles.clamped}>{run.finalReply.text}</p></Cell>)}
    </BlockHead>
  );
}

export function ReplyDetail({ opened }: DetailProps) {
  const { t } = useTranslation();
  return (
    <BlockHead title={t('console.task.compare.blocks.reply.title')} hint={t('console.task.compare.blocks.reply.hint')}>
      {opened.map(run => <Cell key={run.id}><p className={styles.reply}>{run.finalReply.text}</p></Cell>)}
    </BlockHead>
  );
}
