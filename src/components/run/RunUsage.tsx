import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { ConsoleRunDetail } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { groupedNumber } from '../../i18n/locales';
import { StatTile, StatTiles } from '../../ui/content';
import table from '../../ui/table.module.css';
import { formatCost } from '../result/presentation';
import styles from './RunUsage.module.css';

/** What the run consumed: tokens, cost and calls, and how often it called each tool. */
export function RunUsageTab({ run }: { run: ConsoleRunDetail }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { usage } = run;
  return (
    <div className={styles.tab}>
      <StatTiles>
        <StatTile label={t('console.run.usage.inputTokens')} value={groupedNumber(locale, usage.inputTokens)} note={`${t('console.run.usage.cachedTokens')} ${groupedNumber(locale, usage.cachedTokens)}`} />
        <StatTile label={t('console.run.usage.outputTokens')} value={groupedNumber(locale, usage.outputTokens)} />
        <StatTile label={t('console.run.usage.cost')} value={formatCost(usage.costUsd)} />
        <StatTile label={t('console.run.usage.modelCalls')} value={groupedNumber(locale, usage.modelCalls)} />
      </StatTiles>
      <section className={styles.tab}>
        <h2 className="t-heading">{t('console.run.usage.tools')}</h2>
        <div className={clsx(table.table, styles.tools)} role="table" aria-label={t('console.run.usage.tools')}>
          <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
            <span role="columnheader">{t('console.run.usage.column.tool')}</span>
            <span role="columnheader">{t('console.run.usage.column.calls')}</span>
            <span role="columnheader">{t('console.run.usage.column.failures')}</span>
          </div>
          {usage.toolCalls.map(tool => (
            <div key={tool.tool} className={table.row} role="row">
              <span role="cell" className="t-mono">{tool.tool}</span>
              <span role="cell" className="t-numeric">{tool.calls}</span>
              <span role="cell" className={clsx('t-numeric', tool.failures > 0 ? 'c-bad' : 'c-faint')}>{tool.failures}</span>
            </div>
          ))}
        </div>
      </section>
      <p className="t-micro c-faint">{t('console.run.usage.note')}</p>
    </div>
  );
}
