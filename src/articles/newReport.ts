import { stringify } from 'yaml';
import type { ReportSources } from '../api/types';
import { I18N } from '../i18n/i18n';
import { LOCALES } from '../i18n/locales';

/** A new report's documents, one per language, naming the benchmark and the day, for the author to fill in. */
export function newReportSources(benchmarkId: string, date: string): ReportSources {
  return Object.fromEntries(LOCALES.map(locale => {
    const { t } = I18N[locale];
    const frontmatter = stringify({ title: t('console.report.template.title'), date, summary: t('console.report.template.summary'), benchmarks: [benchmarkId] });
    return [locale, `---\n${frontmatter}---\n\n## ${t('console.report.template.heading')}\n\n<RunCard run="" />\n`];
  })) as ReportSources;
}
