import { clsx } from 'clsx';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useConsoleUser, useSettings, useUpdateSettings } from '../../../api/consoleClient';
import { EMAIL_PATTERN, MAX_REPORT_CHECKS, REPORT_REVIEWER_CHOICES } from '../../../api/constraints';
import type { Settings, SettingsChange } from '../../../api/types';
import { SettingsView } from '../../../components/settings/SettingsView';
import { ChangeFailure } from '../../../components/change/ChangeFailure';
import { hasUnsavedChange } from '../../../components/change/unsavedChange';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import content from '../../../ui/content.module.css';
import { Button, Select, SubmitButton, TextField } from '../../../ui/controls';
import { InfoHint } from '../../../ui/hint';
import styles from './SettingsPage.module.css';

/** The workspace's name and public contact, and the rules a report passes before it is committed; administrators change them. */
export function SettingsPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const settings = useSettings();
  const administering = useConsoleUser().can.administer;
  return (
    <div className={styles.page}>
      <ConsoleHeader title={t('console.settings.title')} about={t('console.settings.about')} />
      {administering ? <SettingsForm settings={settings} /> : <SettingsView settings={settings} />}
      <p className="t-micro c-faint">{t('console.settings.updated', { account: settings.updatedBy, at: dateTimeOf(locale, settings.updatedAt) })}</p>
    </div>
  );
}

/** The settings being changed; saving sends them whole, once the browser finds every field filled and the address well formed. */
export function SettingsForm({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const update = useUpdateSettings();
  const [change, setChange] = useState<SettingsChange>({ workspace: settings.workspace, publication: settings.publication });
  const { workspace, publication } = change;
  const setWorkspace = (next: Partial<SettingsChange['workspace']>) => setChange({ ...change, workspace: { ...workspace, ...next } });
  const setPublication = (next: Partial<SettingsChange['publication']>) => setChange({ ...change, publication: { ...publication, ...next } });
  const setCheck = (index: number, text: string) => setPublication({ reportChecks: publication.reportChecks.map((check, at) => (at === index ? text : check)) });
  const unsaved = hasUnsavedChange(change, { workspace: settings.workspace, publication: settings.publication });
  const save = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(change);
  };
  return (
    <form className={styles.form} onSubmit={save}>
      <section className={clsx(content.panel, styles.section)}>
        <h2 className="t-heading">{t('console.settings.workspace.title')}</h2>
        <div className={styles.fields}>
          <TextField label={t('console.settings.workspace.name')} type="text" autoComplete="off" value={workspace.name} onChange={name => setWorkspace({ name })} />
          <TextField
            label={t('console.settings.workspace.contactEmail')} type="text" autoComplete="email" value={workspace.contactEmail} onChange={contactEmail => setWorkspace({ contactEmail })}
            pattern={{ regex: EMAIL_PATTERN, hint: t('console.settings.workspace.contactEmailHint') }}
          />
        </div>
      </section>
      <section className={clsx(content.panel, styles.section)}>
        <h2 className="t-heading">{t('console.settings.publication.title')}</h2>
        <div className={styles.field}>
          <span className={styles.label}>
            <span className="t-micro c-muted" aria-hidden="true">{t('console.settings.publication.reviewers')}</span>
            <InfoHint label={t('ui.about', { subject: t('console.settings.publication.reviewers') })}>{t('console.settings.publication.reviewersNote')}</InfoHint>
          </span>
          <Select
            label={t('console.settings.publication.reviewers')} value={String(publication.reportReviewers)} onChange={count => setPublication({ reportReviewers: Number(count) })}
            choices={REPORT_REVIEWER_CHOICES.map(count => ({ value: String(count), label: t('console.settings.publication.reviewerCount', { count }) }))}
          />
        </div>
        <div className={styles.checks}>
          <span className={styles.label}>
            <span className="t-micro c-muted">{t('console.settings.publication.checks')}</span>
            <InfoHint label={t('ui.about', { subject: t('console.settings.publication.checks') })}>{t('console.settings.publication.checksNote')}</InfoHint>
          </span>
          {publication.reportChecks.map((check, index) => (
            // The checks have no identity but their place; a removal re-renders those after it.
            <div key={index} className={styles.check}>
              <TextField label={t('console.settings.publication.check', { index: index + 1 })} type="text" autoComplete="off" value={check} onChange={text => setCheck(index, text)} />
              <Button variant="line" onClick={() => setPublication({ reportChecks: publication.reportChecks.filter((_, at) => at !== index) })}>{t('console.settings.publication.removeCheck')}</Button>
            </div>
          ))}
          {publication.reportChecks.length < MAX_REPORT_CHECKS && (
            <div><Button variant="line" onClick={() => setPublication({ reportChecks: [...publication.reportChecks, ''] })}>{t('console.settings.publication.addCheck')}</Button></div>
          )}
        </div>
      </section>
      <ChangeFailure error={update.error} />
      <div className={styles.buttons}>
        <SubmitButton variant="solid" pending={update.isPending}>{t('console.settings.save')}</SubmitButton>
        {unsaved ? <p className="t-small c-muted">{t('console.settings.unsaved')}</p> : update.isSuccess && <p className="t-small c-muted" role="status">{t('console.settings.saved')}</p>}
      </div>
    </form>
  );
}
