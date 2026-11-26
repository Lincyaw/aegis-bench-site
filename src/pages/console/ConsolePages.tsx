import { useTranslation } from 'react-i18next';
import { useLocation, useRouteError } from 'react-router-dom';
import { ApiError, HuggingFaceUnreachableError } from '../../api/errors';
import { UnreachableRecords } from '../../components/run/HuggingFace';
import { ConsoleHeader } from '../../components/shell/ConsoleHeader';
import { LocaleNavigate } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { sitePath } from '../../i18n/locales';
import { CONSOLE_PATH, signInPath } from '../../routes/console';
import { ButtonLink } from '../../ui/controls';

/** A console page whose data cannot be loaded: an ended session signs in again, any other failure is shown. */
export function ConsoleError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const locale = useLocale();
  const { pathname, search } = useLocation();
  if (error instanceof ApiError && error.status === 401) {
    return <LocaleNavigate replace to={signInPath(`${sitePath(locale, pathname)}${search}`)} />;
  }
  return (
    <div role="alert">
      <ConsoleHeader title={t('console.error.title')} lead={error instanceof HuggingFaceUnreachableError ? undefined : error instanceof Error ? error.message : String(error)} />
      {error instanceof HuggingFaceUnreachableError && <UnreachableRecords error={error} />}
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
