import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { HuggingFaceUnreachableError } from '../../api/errors';
import controls from '../../ui/controls.module.css';
import { InfoHint } from '../../ui/hint';
import styles from './HuggingFace.module.css';

/** The link that opens records kept on Hugging Face, with the ⓘ that says what is kept there. */
export function HuggingFaceLink({ about, url }: { about: string; url: string }) {
  const { t } = useTranslation();
  return (
    <p className={styles.link}>
      <a className={clsx(controls.textLink, 't-micro')} href={url} target="_blank" rel="noreferrer">{t('ui.openOnHuggingFace')}</a>
      <InfoHint label={t('ui.about', { subject: t('ui.openOnHuggingFace') })}>{about}</InfoHint>
    </p>
  );
}

/** Says in place that records kept on Hugging Face could not be read, and links them there. */
export function UnreachableRecords({ error }: { error: HuggingFaceUnreachableError }) {
  const { t } = useTranslation();
  return (
    <div className={styles.unreachable} role="status">
      <p className="t-small">{t('ui.huggingFaceUnreachable')}</p>
      <HuggingFaceLink about={t('ui.huggingFaceUnreachableNote')} url={error.huggingFaceUrl} />
    </div>
  );
}

/**
 * Shows its children, or, when records they need are kept on Hugging Face and cannot be read, says so in their place;
 * any other failure goes on to the page's error. `resetKey` names what the children show, so choosing another tries again.
 */
export function HuggingFaceBoundary({ resetKey, children }: { resetKey: string; children: ReactNode }) {
  return (
    <ErrorBoundary
      resetKeys={[resetKey]}
      fallbackRender={({ error }) => {
        if (!(error instanceof HuggingFaceUnreachableError)) {
          throw error;
        }
        return <UnreachableRecords error={error} />;
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
