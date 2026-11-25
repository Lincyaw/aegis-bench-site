import { useTranslation } from 'react-i18next';
import type { FailureClass } from '../api/types';
import { Tag } from '../ui/content';

/** The class a review gave a failed run; an unreviewed failure says so in a dashed tag. */
export function FailureClassTag({ failureClass }: { failureClass: FailureClass | undefined }) {
  const { t } = useTranslation();
  return failureClass ? <Tag>{t(`console.failureClass.${failureClass}`)}</Tag> : <Tag dashed>{t('console.failureClass.unreviewed')}</Tag>;
}
