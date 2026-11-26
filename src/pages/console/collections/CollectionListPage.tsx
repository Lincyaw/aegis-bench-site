import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useCollections, useConsoleBenchmark } from '../../../api/consoleClient';
import { FailureBar, FailureLegend } from '../../../components/result/FailureBar';
import { PassRate } from '../../../components/result/PassRate';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { groupedNumber } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { collectionPath } from '../../../routes/consoleCollections';
import table from '../../../ui/table.module.css';
import styles from './CollectionPages.module.css';

/** One collection per tag of a benchmark's tasks; a row opens the collection. */
export function CollectionListPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const collections = useCollections(benchmark.id);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.collections.title') }]} title={t('console.collections.title')} about={t('console.collections.about')} />
      <div className={clsx(table.table, styles.collections)} role="table" aria-label={t('console.collections.title')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.collections.column.tag')}</span>
          <span role="columnheader">{t('console.collections.column.tasks')}</span>
          <span role="columnheader">{t('console.collections.column.passRate')}</span>
          <span role="columnheader">{t('console.collections.column.counted')}</span>
          <span role="columnheader">{t('console.collections.column.failures')}</span>
        </div>
        {collections.map(({ tag, taskCount, result }) => {
          const to = collectionPath(benchmark.id, tag);
          return (
            <div key={tag} className={clsx(table.row, table.link)} role="row">
              <span role="cell"><LocaleLink to={to} className={clsx(table.primary, 't-label')}>{tag}</LocaleLink></span>
              <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, taskCount)}</span>
              <span role="cell"><PassRate rate={result.passRate} /></span>
              <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, result.passed + result.failed)}</span>
              <span role="cell"><FailureBar result={result} /></span>
            </div>
          );
        })}
      </div>
      <FailureLegend />
    </div>
  );
}
