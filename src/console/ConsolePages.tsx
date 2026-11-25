import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useRouteError } from 'react-router-dom';
import { ApiError, HuggingFaceUnreachableError } from '../api/client';
import { UnreachableRecords } from '../runs/HuggingFace';
import { useLocale } from '../i18n/localeContext';
import { localizedPath, sitePath } from '../i18n/locales';
import { ButtonLink } from '../ui/controls';
import { ConsoleHeader } from './ConsoleHeader';
import { CONSOLE_PATH, signInPath } from './consoleMap';

/** A console page whose data cannot be loaded: an ended session signs in again, any other failure is shown. */
export function ConsoleError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const locale = useLocale();
  const { pathname, search } = useLocation();
  if (error instanceof ApiError && error.status === 401) {
    return <Navigate replace to={localizedPath(locale, signInPath(`${sitePath(locale, pathname)}${search}`))} />;
  }
  return (
    <div role="alert">
      <ConsoleHeader title={t('console.error.title')} lead={error instanceof HuggingFaceUnreachableError ? undefined : error instanceof Error ? error.message : String(error)} />
      {error instanceof HuggingFaceUnreachableError && <UnreachableRecords error={error} />}
      <ButtonLink to={CONSOLE_PATH} variant="line">{t('console.error.toConsole')}</ButtonLink>
    </div>
  );
}

/**
 * A change the API refused, said where it was asked for, in the reader's language when the place knows what the status
 * means there; a refused role always is. Any other failure is the page's error.
 */
export function ChangeFailure({ error, reasons = {} }: { error: Error | null; reasons?: Partial<Record<number, string>> }) {
  const { t } = useTranslation();
  if (error !== null && !(error instanceof ApiError)) {
    throw error;
  }
  const message = error && (reasons[error.status] ?? (error.status === 403 ? t('console.forbidden') : error.reason));
  return error && <p className="t-small c-bad" role="alert">{t('console.failed', { message })}</p>;
}

export function ConsoleNotFound() {
  const { t } = useTranslation();
  return (
    <div>
      <ConsoleHeader title={t('console.error.notFound')} />
      <ButtonLink to={CONSOLE_PATH} variant="line">{t('console.error.toConsole')}</ButtonLink>
    </div>
  );
}
