import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/errors';

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
