import { clsx } from 'clsx';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import type { Combination, ConsoleBenchmark, EntrantKey, ReleaseContent } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { LOCALES, LOCALE_NAMES } from '../../i18n/locales';
import { consoleRunPath } from '../../routes/consoleRuns';
import { FactList, HintedHeading } from '../../ui/content';
import content from '../../ui/content.module.css';
import { Button, SubmitButton, TextArea, TextField, ToggleChip } from '../../ui/controls';
import { ModelLabel } from '../model/ModelBadge';
import { combinationName } from '../result/presentation';
import { ChangeFailure } from '../change/ChangeFailure';
import { isEntrant } from './entrants';
import styles from './ReleaseContent.module.css';

/** What a published release shows: the summary in each language, the ranked combinations and the example runs. */
export function ReleaseContentView({ benchmark, shown }: { benchmark: ConsoleBenchmark; shown: ReleaseContent }) {
  const { t } = useTranslation();
  return (
    <>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.release.summary')}</h2>
        <FactList layout="rows" facts={LOCALES.map(locale => ({ label: LOCALE_NAMES[locale], value: shown.summary[locale] }))} />
      </section>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.release.entrants')}</h2>
        <ul className={styles.entrants}>
          {benchmark.entrants.filter(entrant => shown.entrants.some(key => isEntrant(key, entrant))).map(({ model, harness }) => (
            <li key={combinationKey(model.id, harness.id)}><ModelLabel model={model} /><span className="t-small c-muted">{harness.name}</span></li>
          ))}
        </ul>
      </section>
      <section className={styles.section}>
        <HintedHeading rank="h2" className="t-heading" title={t('console.release.replays')} about={t('console.release.replaysNote')} />
        <ol className={styles.replays}>
          {shown.replays.map(runId => <li key={runId}><LocaleLink className="t-mono" to={consoleRunPath(benchmark.id, runId)}>{runId}</LocaleLink></li>)}
        </ol>
      </section>
    </>
  );
}

/** Which of the benchmark's combinations the leaderboard ranks; the last one chosen cannot be dropped. */
export function EntrantChoice({ entrants, chosen, onChange }: { entrants: Combination[]; chosen: EntrantKey[]; onChange: (chosen: EntrantKey[]) => void }) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <HintedHeading rank="h2" className="t-heading" title={t('console.release.entrants')} about={t('console.release.entrantsNote')} />
      <div className={styles.chips} role="group" aria-label={t('console.release.entrants')}>
        {entrants.map(entrant => {
          const pressed = chosen.some(key => isEntrant(key, entrant));
          return (
            <ToggleChip
              key={combinationKey(entrant.model.id, entrant.harness.id)} pressed={pressed} disabled={pressed && chosen.length === 1}
              onToggle={() => onChange(pressed ? chosen.filter(key => !isEntrant(key, entrant)) : [...chosen, { modelId: entrant.model.id, harnessId: entrant.harness.id }])}
            >
              {combinationName(entrant.model, entrant.harness)}
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
    if (added) {
      onChange(replays.includes(added) ? replays : [...replays, added]);
      setRunId('');
    }
  };
  return (
    <section className={styles.section}>
      <HintedHeading rank="h2" className="t-heading" title={t('console.release.replays')} about={t('console.release.replaysNote')} />
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
