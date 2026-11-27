import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleUser, useDiscardDraft, usePublishRelease, useRelease, useRestoreRelease, useUpdateDraft } from '../../../api/consoleClient';
import type { ConsoleBenchmark, ReleaseDetail } from '../../../api/types';
import { EntrantChoice, ReleaseContentView, ReleaseNoteForm, ReplayEditor } from '../../../components/release/ReleaseContent';
import { ReleaseChangesText, ReleaseStatusTag } from '../../../components/release/ReleaseLabels';
import { ChangeFailure } from '../../../components/change/ChangeFailure';
import { DiscardAfterConfirm } from '../../../components/change/DiscardAfterConfirm';
import { hasUnsavedChange } from '../../../components/change/unsavedChange';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { LOCALES, LOCALE_NAMES, dateTimeOf } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { benchmarkReleasesPath, releasePath } from '../../../routes/consoleReleases';
import { benchmarkPath } from '../../../routes/site';
import { ButtonLink, SubmitButton, TextArea } from '../../../ui/controls';
import styles from './ReleasePages.module.css';

/** One release: what it puts on the public site, and what can be done with it in its state. */
export function ReleasePage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const { benchmarkId = '', releaseId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const release = useRelease(releaseId);
  const restore = useRestoreRelease(release.id);
  const editing = useConsoleUser().can.edit;
  const version = t('console.releases.version', { version: release.version });
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.benchmarkReleases.title'), to: benchmarkReleasesPath(benchmark.id) }, { label: version }]}
        title={version} about={t(`console.release.about.${release.status}`)}
        actions={release.status === 'current' && <ButtonLink to={benchmarkPath(benchmark.id)} variant="line">{t('console.release.viewPublic')}</ButtonLink>}
      />
      <div className={styles.facts}>
        <ReleaseStatusTag status={release.status} />
        {release.restoresVersion !== undefined && <span className="t-small c-muted">{t('console.releases.restores', { version: release.restoresVersion })}</span>}
        <span className="t-mono c-faint">{release.author} · {dateTimeOf(locale, release.updatedAt)}</span>
      </div>
      {release.note && <p className="t-body">{release.note}</p>}
      <p className={styles.changes}><span className="t-micro c-faint">{t('console.release.changes')}</span><ReleaseChangesText changes={release.changes} /></p>
      {release.status === 'draft' && editing
        ? <DraftEditor key={release.id} benchmark={benchmark} release={release} />
        : <ReleaseContentView benchmark={benchmark} shown={release.content} />}
      {release.status === 'superseded' && editing && (
        <ReleaseNoteForm
          title={t('console.release.restore')} lead={t('console.release.restoreLead')} confirm={t('console.release.confirmRestore')}
          pending={restore.isPending} error={restore.error}
          onSubmit={note => restore.mutate(note, { onSuccess: restored => navigate(releasePath(benchmark.id, restored.id)) })}
        />
      )}
    </div>
  );
}

/**
 * A draft's content being edited. Saving sends it whole, once the browser finds every summary filled; publishing
 * publishes what was saved, so it waits until no change is left unsaved. The run id field has a form of its own, so the
 * save button joins the draft's form by its id.
 */
export function DraftEditor({ benchmark, release }: { benchmark: ConsoleBenchmark; release: ReleaseDetail }) {
  const { t } = useTranslation();
  const formId = useId();
  const [draft, setDraft] = useState(release.content);
  const update = useUpdateDraft(release.id);
  const publish = usePublishRelease(release.id);
  const unsaved = hasUnsavedChange(draft, release.content);
  return (
    <>
      <form id={formId} className={styles.form} onSubmit={event => { event.preventDefault(); update.mutate(draft); }}>
        <section className={styles.section}>
          <h2 className="t-heading">{t('console.release.summary')}</h2>
          <div className={styles.summaries}>
            {LOCALES.map(locale => (
              <TextArea key={locale} label={LOCALE_NAMES[locale]} rows={3} value={draft.summary[locale]} onChange={text => setDraft({ ...draft, summary: { ...draft.summary, [locale]: text } })} />
            ))}
          </div>
        </section>
        <EntrantChoice entrants={benchmark.entrants} chosen={draft.entrants} onChange={entrants => setDraft({ ...draft, entrants })} />
      </form>
      <ReplayEditor benchmarkId={benchmark.id} replays={draft.replays} onChange={replays => setDraft({ ...draft, replays })} />
      <div className={styles.buttons}>
        <SubmitButton variant="solid" pending={update.isPending} form={formId}>{t('console.release.save')}</SubmitButton>
        {unsaved ? <p className="t-small c-muted">{t('console.release.unsaved')}</p> : update.isSuccess && <p className="t-small c-muted" role="status">{t('console.release.saved')}</p>}
      </div>
      <ChangeFailure error={update.error} reasons={{ 409: t('console.release.changedElsewhere'), 422: t('console.release.foreignContent') }} />
      {!unsaved && (
        <ReleaseNoteForm
          title={t('console.release.publish')} lead={t('console.release.publishLead')} confirm={t('console.release.confirmPublish')}
          pending={publish.isPending} error={publish.error} onSubmit={note => publish.mutate(note)}
        />
      )}
      <DiscardDraft benchmarkId={benchmark.id} releaseId={release.id} />
    </>
  );
}

/** Dropping a draft, which asks again first; the benchmark's releases open afterwards. */
export function DiscardDraft({ benchmarkId, releaseId }: { benchmarkId: string; releaseId: string }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const discard = useDiscardDraft(releaseId);
  return (
    <DiscardAfterConfirm
      labels={{ discard: t('console.release.discard'), lead: t('console.release.discardLead'), confirm: t('console.release.confirmDiscard'), cancel: t('console.release.cancel') }}
      error={discard.error} reasons={{ 409: t('console.release.changedElsewhere') }}
      onConfirm={() => discard.mutate(undefined, { onSuccess: () => navigate(benchmarkReleasesPath(benchmarkId)) })}
    />
  );
}
