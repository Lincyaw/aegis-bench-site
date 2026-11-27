import { clsx } from 'clsx';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { localeValues } from '../../api/schema';
import type { Locale, ReportDraft, ReportSources } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf } from '../../i18n/locales';
import { HintedHeading, Tag } from '../../ui/content';
import content from '../../ui/content.module.css';
import { Button, ButtonLink, SegmentedControl } from '../../ui/controls';
import styles from './ReportDocument.module.css';

/** How the editor lays out a document: its source beside its preview, or either alone. */
const EDITOR_VIEWS = ['split', 'source', 'preview'] as const;
type EditorView = (typeof EDITOR_VIEWS)[number];

/** The blocks the toolbar inserts at the cursor; a run block waits for the run's id. */
const INSERTS = [
  { label: 'console.report.insert.callout', snippet: '<Callout>\n\n</Callout>' },
  { label: 'console.report.insert.facts', snippet: '<Facts>\n  <Fact label="">\n  </Fact>\n</Facts>' },
  { label: 'console.report.insert.runCard', snippet: '<RunCard run="" />' },
  { label: 'console.report.insert.number', snippet: '<RunNumber run="" field="steps" />' },
] as const;

/**
 * A document in one language at a time, its source beside its preview or either alone, with blocks to insert while it
 * is editable. The page renders the preview of the language and format shown.
 */
export function DocumentEditor({ fileOf, sources, editing, onChange, preview }: {
  fileOf: (locale: Locale) => string; sources: ReportSources; editing: boolean; onChange: (sources: ReportSources) => void; preview: (source: string, format: 'md' | 'mdx') => ReactNode;
}) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<Locale>(useLocale());
  const [view, setView] = useState<EditorView>('split');
  const source = useRef<HTMLTextAreaElement>(null);
  const file = fileOf(language);
  const insert = (snippet: string) => {
    const area = source.current;
    if (!area) {
      throw new Error('the toolbar shows only beside the source');
    }
    const text = sources[language];
    onChange({ ...sources, [language]: `${text.slice(0, area.selectionStart)}${snippet}${text.slice(area.selectionEnd)}` });
  };
  return (
    <>
      <div className={styles.toolbar}>
        <SegmentedControl label={t('console.report.language')} value={language} onChange={setLanguage} choices={localeValues.map(value => ({ value, label: t(`console.report.languages.${value}`) }))} />
        <SegmentedControl label={t('console.report.view')} value={view} onChange={setView} choices={EDITOR_VIEWS.map(value => ({ value, label: t(`console.report.views.${value}`) }))} />
        {editing && view !== 'preview' && (
          <div className={styles.inserts} role="group" aria-label={t('console.report.insert.label')}>
            {INSERTS.map(entry => <Button key={entry.label} variant="quiet" onClick={() => insert(entry.snippet)}>{t(entry.label)}</Button>)}
          </div>
        )}
      </div>
      <div className={styles.columns} data-view={view}>
        {view !== 'preview' && (
          <label className={styles.sourceColumn}>
            <span className="t-mono c-faint">{file.slice(1)}</span>
            <textarea ref={source} className={styles.source} spellCheck={false} readOnly={!editing} value={sources[language]} onChange={event => onChange({ ...sources, [language]: event.target.value })} />
          </label>
        )}
        {view !== 'source' && preview(sources[language], file.endsWith('.md') ? 'md' : 'mdx')}
      </div>
    </>
  );
}

/** An approved draft's files, each to download and commit at the path it names. */
export function ReportFiles({ report, fileOf }: { report: ReportDraft; fileOf: (locale: Locale) => string }) {
  const { t } = useTranslation();
  return (
    <section className={clsx(content.panel, styles.action)}>
      <HintedHeading rank="h2" className="t-heading" title={t('console.report.export.title')} about={t('console.report.export.note')} />
      <ul className={styles.files}>
        {localeValues.map(locale => {
          const file = fileOf(locale).slice(1);
          return (
            <li key={locale}>
              <span className="t-mono">{file}</span>
              <ButtonLink variant="line" size="medium" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(report.sources[locale])}`} download={file.split('/').at(-1) ?? file}>{t('console.report.export.download')}</ButtonLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Every review of the draft, oldest first, across its submissions. */
export function ReviewHistory({ report }: { report: ReportDraft }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <section className={styles.section}>
      <h2 className="t-heading">{t('console.report.history')}</h2>
      <ol className={styles.reviews}>
        {report.reviews.map(entry => (
          <li key={`${entry.reviewer}-${entry.at}`}>
            <span className={styles.reviewHead}>
              <span className="t-label">{entry.reviewer}</span>
              <Tag dashed={entry.verdict === 'requestChanges'}>{t(`console.report.verdict.${entry.verdict}`)}</Tag>
              <span className="t-mono c-faint">{dateTimeOf(locale, entry.at)}</span>
            </span>
            {entry.comment && <span className="t-small c-muted">{entry.comment}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
