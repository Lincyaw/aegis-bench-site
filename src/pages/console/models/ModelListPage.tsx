import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleModels } from '../../../api/consoleClient';
import { VendorBadge } from '../../../components/model/ModelBadge';
import { FailureLegend } from '../../../components/result/FailureBar';
import { ResultTable } from '../../../components/result/ResultTable';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { consoleBenchmarkPath } from '../../../routes/console';
import { consoleModelPath } from '../../../routes/consoleModels';
import { Tag } from '../../../ui/content';
import table from '../../../ui/table.module.css';
import styles from './ModelPages.module.css';

/** Every model that ran on a benchmark, each over all the harnesses it ran in; a row opens the model. */
export function ModelListPage() {
  const { t } = useTranslation();
  const { benchmarkId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const models = useConsoleModels(benchmark.id);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.models.title') }]} title={t('console.models.title')} about={t('console.models.about')} lead={t('console.models.lead', { count: models.length })} />
      <ResultTable
        label={t('console.models.title')} heads={[t('console.models.column.model'), t('console.models.column.harnesses')]} lead="minmax(12rem, 1.4fr) minmax(8rem, 1fr)"
        rows={models.map(({ model, harnesses, result }) => ({
          id: model.id, result,
          cells: [
            <span key="model" role="cell" className={styles.model}>
              <VendorBadge model={model} />
              <span className={styles.name}><LocaleLink to={consoleModelPath(benchmark.id, model.id)} className={clsx(table.primary, 't-label')}>{model.name}</LocaleLink><span className="t-micro c-faint">{model.vendor}</span></span>
            </span>,
            <span key="harnesses" role="cell" className={styles.tags}>{harnesses.map(harness => <Tag key={harness.id}>{harness.name}</Tag>)}</span>,
          ],
        }))}
      />
      <FailureLegend />
    </div>
  );
}
