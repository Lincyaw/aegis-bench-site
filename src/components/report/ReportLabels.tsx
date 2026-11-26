import { useTranslation } from 'react-i18next';
import type { ReportStatus } from '../../api/types';
import { Tag } from '../../ui/content';

/** Where a report draft stands; one still being written is dashed, as it is not settled yet. */
export function ReportStatusTag({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  return <Tag dashed={status === 'draft'}>{t(`console.reports.status.${status}`)}</Tag>;
}
