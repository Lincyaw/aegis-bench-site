import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTaskRevisions } from '../../../api/consoleClient';
import type { ConsoleTaskDetail } from '../../../api/types';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { Tag } from '../../../ui/content';
import { InfoHint } from '../../../ui/hint';
import table from '../../../ui/table.module.css';
import styles from './TaskDetailPage.module.css';

/**
 * The versions that led to the task's current one, newest first, with the runs each version's results count; the
 * version the reader came for is marked and scrolled to.
 */
export function TaskRevisionsTab({ task, version }: { task: ConsoleTaskDetail; version?: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const revisions = useTaskRevisions(task.benchmark.id, task.id);
  const marked = useRef<HTMLDivElement>(null);
  // A block, not an expression: browsers that return a promise from scrollIntoView would hand React a cleanup that is not a function.
  useEffect(() => {
    marked.current?.scrollIntoView({ block: 'center' });
  }, [version]);
  if (version && !revisions.some(revision => revision.version === version)) {
    throw new Error(`${task.id} has no version ${version}`);
  }
  return (
    <div className={styles.section}>
      <div className={clsx(table.table, styles.revisions)} role="table" aria-label={t('console.task.tabs.revisions')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.task.revisions.column.version')}</span>
          <span role="columnheader">{t('console.task.revisions.column.change')}</span>
          <span role="columnheader">{t('console.task.revisions.column.note')}</span>
          <span role="columnheader">{t('console.task.revisions.column.author')}</span>
          <span role="columnheader">{t('console.task.revisions.column.registeredAt')}</span>
          <span role="columnheader" className={table.hinted}>
            {t('console.task.revisions.column.runs')}<InfoHint label={t('ui.about', { subject: t('console.task.revisions.column.runs') })}>{t('console.task.revisions.note')}</InfoHint>
          </span>
        </div>
        {revisions.map(revision => (
          <div
            key={revision.version} ref={revision.version === version ? marked : undefined} className={table.row} role="row"
            aria-current={revision.version === version ? 'true' : undefined}
          >
            <span role="cell" className={styles.version}><span className="t-mono">{revision.version}</span>{revision.current && <Tag>{t('console.task.revisions.current')}</Tag>}</span>
            <span role="cell" className="t-small">{t(`console.task.revisions.change.${revision.change}`)}</span>
            <span role="cell" className="t-small c-muted">{revision.note}</span>
            <span role="cell" className="t-mono c-muted">{revision.author}</span>
            <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, revision.registeredAt)}</span>
            <span role="cell" className="t-micro c-muted">{t('console.task.revisions.runs', { runs: revision.runs, counted: revision.counted })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
