import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleModels } from '../../../api/consoleClient';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { FailureBar, FailureLegend } from '../../../components/result/FailureBar';
import { PassRate } from '../../../components/result/PassRate';
import { formatCost } from '../../../components/result/presentation';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { groupedNumber } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { consoleModelPath } from '../../../routes/consoleModels';
import { Tag } from '../../../ui/content';
import table from '../../../ui/table.module.css';
import styles from './ModelPages.module.css';

/** Every model that ran on a benchmark, each over all the harnesses it ran in; a row opens the model. */
export function ModelListPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const { benchmarkId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const models = useConsoleModels(benchmark.id);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.models.title') }]} title={t('console.models.title')} lead={t('console.models.lead', { count: models.length })} />
      <div className={clsx(table.table, styles.models)} role="table" aria-label={t('console.models.title')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.models.column.model')}</span>
          <span role="columnheader">{t('console.models.column.harnesses')}</span>
          <span role="columnheader">{t('console.models.column.passRate')}</span>
          <span role="columnheader">{t('console.models.column.everyTime')}</span>
          <span role="columnheader">{t('console.models.column.once')}</span>
          <span role="columnheader">{t('console.models.column.counted')}</span>
          <span role="columnheader">{t('console.models.column.cost')}</span>
          <span role="columnheader">{t('console.models.column.failures')}</span>
        </div>
        {models.map(({ model, harnesses, result }) => {
          const to = consoleModelPath(benchmark.id, model.id);
          return (
            <div key={model.id} className={clsx(table.row, table.link)} role="row" onClick={event => { if (!(event.target as HTMLElement).closest('a')) { navigate(to); } }}>
              <span role="cell" className={styles.model}>
                <VendorBadge model={model} />
                <span className={styles.name}><LocaleLink to={to} className="t-label">{model.name}</LocaleLink><span className="t-micro c-faint">{model.vendor}</span></span>
              </span>
              <span role="cell" className={styles.tags}>{harnesses.map(harness => <Tag key={harness.id}>{harness.name}</Tag>)}</span>
              <span role="cell"><PassRate rate={result.passRate} /></span>
              <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedEveryTime, total: result.tasks })}</span>
              <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedOnce, total: result.tasks })}</span>
              <span role="cell" className="t-numeric c-muted">{groupedNumber(locale, result.passed + result.failed)}</span>
              <span role="cell" className="t-numeric c-muted">{result.meanCostUsd === undefined ? '—' : formatCost(result.meanCostUsd)}</span>
              <span role="cell"><FailureBar result={result} /></span>
            </div>
          );
        })}
      </div>
      <FailureLegend />
    </div>
  );
}
