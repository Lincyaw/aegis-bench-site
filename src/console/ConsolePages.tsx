import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useRouteError } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useConsoleBenchmarks } from '../api/consoleClient';
import { useLocale } from '../i18n/localeContext';
import { localizedPath, sitePath } from '../i18n/locales';
import { ButtonLink } from '../ui/controls';
import { ConsoleHeader } from './ConsoleHeader';
import { CONSOLE_PATH, consoleBenchmarkPath, signInPath } from './consoleMap';

/** The console's address alone opens the first benchmark's overview. */
export function ConsoleHome() {
  const locale = useLocale();
  const [first] = useConsoleBenchmarks();
  return <Navigate replace to={localizedPath(locale, consoleBenchmarkPath(first.id))} />;
}

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
      <ConsoleHeader title={t('console.error.title')} lead={error instanceof Error ? error.message : String(error)} />
      <ButtonLink to={CONSOLE_PATH} variant="line">{t('console.error.toConsole')}</ButtonLink>
    </div>
  );
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
