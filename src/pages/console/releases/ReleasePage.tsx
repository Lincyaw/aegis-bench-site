import { clsx } from 'clsx';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useConsoleUser, useDiscardDraft, usePublishRelease, useRelease, useRestoreRelease, useUpdateDraft } from '../../../api/consoleClient';
import type { Combination, ConsoleBenchmark, EntrantKey, ReleaseContent, ReleaseDetail } from '../../../api/types';
import { ModelLabel } from '../../../components/model/ModelBadge';
import { isEntrant } from '../../../components/release/entrants';
import { ReleaseChangesText, ReleaseStatusTag } from '../../../components/release/ReleaseLabels';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { benchmarkReleasesPath, releasePath } from '../../../routes/consoleReleases';
import { consoleRunPath } from '../../../routes/consoleRuns';
import { benchmarkPath } from '../../../routes/site';
import { FactList } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import { Button, ButtonLink, SubmitButton, TextArea, TextField, ToggleChip } from '../../../ui/controls';
import { ChangeFailure } from '../ConsolePages';
import { mayEdit } from '../roles';
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
  const editing = mayEdit(useConsoleUser().role);
  const version = t('console.releases.version', { version: release.version });
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.benchmarkReleases.title'), to: benchmarkReleasesPath(benchmark.id) }, { label: version }]}
        title={version} lead={t(`console.release.lead.${release.status}`)}
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

/** What a published release shows: the summary in each language, the ranked combinations and the example runs. */
export function ReleaseContentView({ benchmark, shown }: { benchmark: ConsoleBenchmark; shown: ReleaseContent }) {
  const { t } = useTranslation();
  return (
    <>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.release.summary')}</h2>
        <FactList layout="rows" facts={[{ label: t('console.release.summaryZh'), value: shown.summary['zh-CN'] }, { label: t('console.release.summaryEn'), value: shown.summary.en }]} />
      </section>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.release.entrants')}</h2>
        <ul className={styles.entrants}>
          {benchmark.entrants.filter(entrant => shown.entrants.some(key => isEntrant(key, entrant))).map(({ model, harness }) => (
            <li key={`${model.id}-${harness.id}`}><ModelLabel model={model} /><span className="t-small c-muted">{harness.name}</span></li>
          ))}
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.release.replays')}</h2>
        <p className="t-micro c-faint">{t('console.release.replaysNote')}</p>
        <ol className={styles.replays}>
          {shown.replays.map(runId => <li key={runId}><LocaleLink className="t-mono" to={consoleRunPath(benchmark.id, runId)}>{runId}</LocaleLink></li>)}
        </ol>
      </section>
    </>
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
  const unsaved = JSON.stringify(draft) !== JSON.stringify(release.content);
  return (
    <>
      <form id={formId} className={styles.form} onSubmit={event => { event.preventDefault(); update.mutate(draft); }}>
        <section className={styles.section}>
          <h2 className="t-heading">{t('console.release.summary')}</h2>
          <div className={styles.summaries}>
            <TextArea label={t('console.release.summaryZh')} rows={3} value={draft.summary['zh-CN']} onChange={text => setDraft({ ...draft, summary: { ...draft.summary, 'zh-CN': text } })} />
            <TextArea label={t('console.release.summaryEn')} rows={3} value={draft.summary.en} onChange={text => setDraft({ ...draft, summary: { ...draft.summary, en: text } })} />
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

/** Which of the benchmark's combinations the leaderboard ranks; the last one chosen cannot be dropped. */
export function EntrantChoice({ entrants, chosen, onChange }: { entrants: Combination[]; chosen: EntrantKey[]; onChange: (chosen: EntrantKey[]) => void }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <h2 className="t-heading">{t('console.release.entrants')}</h2>
      <p className="t-micro c-faint">{t('console.release.entrantsNote')}</p>
      <div className={styles.chips} role="group" aria-label={t('console.release.entrants')}>
        {entrants.map(entrant => {
          const pressed = chosen.some(key => isEntrant(key, entrant));
          return (
            <ToggleChip
              key={`${entrant.model.id}-${entrant.harness.id}`} pressed={pressed} disabled={pressed && chosen.length === 1}
              onToggle={() => onChange(pressed ? chosen.filter(key => !isEntrant(key, entrant)) : [...chosen, { modelId: entrant.model.id, harnessId: entrant.harness.id }])}
            >
              {entrant.model.name} · {entrant.harness.name}
            </ToggleChip>
          );
        })}
      </div>
    </section>
  );
}

/** A draft's example runs: each can be dropped, and a run is added by its id; a run already listed stays where it is. */
export function ReplayEditor({ benchmarkId, replays, onChange }: { benchmarkId: string; replays: string[]; onChange: (replays: string[]) => void }) {
  const { t } = useTranslation();
  const [runId, setRunId] = useState('');
  const add = (event: FormEvent) => {
    event.preventDefault();
    const added = runId.trim();
    onChange(replays.includes(added) ? replays : [...replays, added]);
    setRunId('');
  };
  return (
    <section className={styles.section}>
      <h2 className="t-heading">{t('console.release.replays')}</h2>
      <p className="t-micro c-faint">{t('console.release.replaysNote')}</p>
      <ol className={styles.replays}>
        {replays.map(replay => (
          <li key={replay}>
            <LocaleLink className="t-mono" to={consoleRunPath(benchmarkId, replay)}>{replay}</LocaleLink>
            <Button variant="line" onClick={() => onChange(replays.filter(id => id !== replay))}>{t('console.release.remove')}</Button>
          </li>
        ))}
      </ol>
      <form className={styles.addReplay} onSubmit={add}>
        <TextField label={t('console.release.replayId')} type="text" autoComplete="off" value={runId} onChange={setRunId} />
        <SubmitButton variant="line" pending={false}>{t('console.release.addReplay')}</SubmitButton>
      </form>
    </section>
  );
}

/** Dropping a draft, which asks again first; the benchmark's releases open afterwards. */
export function DiscardDraft({ benchmarkId, releaseId }: { benchmarkId: string; releaseId: string }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const discard = useDiscardDraft(releaseId);
  const [asking, setAsking] = useState(false);
  return asking ? (
    <div className={clsx(content.panel, styles.action)}>
      <p className="t-small c-muted">{t('console.release.discardLead')}</p>
      <ChangeFailure error={discard.error} reasons={{ 409: t('console.release.changedElsewhere') }} />
      <div className={styles.buttons}>
        <Button variant="line" onClick={() => discard.mutate(undefined, { onSuccess: () => navigate(benchmarkReleasesPath(benchmarkId)) })}>{t('console.release.confirmDiscard')}</Button>
        <Button variant="line" onClick={() => setAsking(false)}>{t('console.release.cancel')}</Button>
      </div>
    </div>
  ) : <div className={styles.buttons}><Button variant="line" onClick={() => setAsking(true)}>{t('console.release.discard')}</Button></div>;
}

/** Publishing a release, a draft or one restored, which asks for the note the release history keeps. */
export function ReleaseNoteForm({ title, lead, confirm, pending, error, onSubmit }: {
  title: string; lead: string; confirm: string; pending: boolean; error: Error | null; onSubmit: (note: string) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  return (
    <form className={clsx(content.panel, styles.action)} onSubmit={event => { event.preventDefault(); onSubmit(note); }}>
      <h2 className="t-heading">{title}</h2>
      <p className="t-small c-muted">{lead}</p>
      <TextArea label={t('console.release.note')} rows={2} value={note} onChange={setNote} />
      <ChangeFailure error={error} reasons={{ 409: t('console.release.changedElsewhere') }} />
      <div className={styles.buttons}><SubmitButton variant="solid" pending={pending}>{confirm}</SubmitButton></div>
    </form>
  );
}
