import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { ChangelogEntry } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf } from '../../i18n/locales';
import { consoleTaskPath } from '../../routes/consoleTasks';
import table from '../../ui/table.module.css';
import styles from './ChangelogTable.module.css';

/** One row per task version; the row opens the task's version history with that version marked. */
export function ChangelogTable({ entries }: { entries: ChangelogEntry[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.changelog)} role="table" aria-label={t('console.changelog.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.changelog.column.registeredAt')}</span>
        <span role="columnheader">{t('console.changelog.column.task')}</span>
        <span role="columnheader">{t('console.changelog.column.version')}</span>
        <span role="columnheader">{t('console.changelog.column.change')}</span>
        <span role="columnheader">{t('console.changelog.column.note')}</span>
        <span role="columnheader">{t('console.changelog.column.author')}</span>
      </div>
      {entries.map(({ benchmark, task, revision }) => {
        const to = consoleTaskPath(benchmark.id, task.id, { tab: 'revisions', version: revision.version });
        return (
          <div key={`${benchmark.id}-${task.id}-${revision.version}`} className={clsx(table.row, table.link)} role="row">
            <span role="cell" className="t-mono c-faint">{dateTimeOf(locale, revision.registeredAt)}</span>
            <span role="cell" className={styles.task}>
              <LocaleLink className={clsx(table.primary, 't-label')} to={to}>{task.title}</LocaleLink>
              <span className="t-mono c-faint">{benchmark.name} · {task.id}</span>
            </span>
            <span role="cell" className="t-mono">{revision.version}</span>
            <span role="cell" className="t-small">{t(`console.task.revisions.change.${revision.change}`)}</span>
            <span role="cell" className="t-small c-muted">{revision.note}</span>
            <span role="cell" className="t-mono c-muted">{revision.author}</span>
          </div>
        );
      })}
    </div>
  );
}
