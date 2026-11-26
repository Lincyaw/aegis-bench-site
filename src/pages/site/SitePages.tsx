import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useLocation, useRouteError } from 'react-router-dom';
import { useSiteInfo } from '../../api/client';
import { useLocale } from '../../i18n/localeContext';
import { sitePath } from '../../i18n/locales';
import { BENCHMARKS_PATH, CONTACT_ANCHOR } from '../../routes/site';
import { ButtonLink } from '../../ui/controls';
import { FOOTER_LINKS } from './siteNav';
import styles from './SiteLayout.module.css';

/** Sections the design has not drawn yet, and addresses that lead nowhere; the about page already gives the contact. */
export function PendingPage() {
  const { t } = useTranslation();
  const path = sitePath(useLocale(), useLocation().pathname);
  const { contactEmail } = useSiteInfo();
  const link = FOOTER_LINKS.find(candidate => candidate.to === path);
  return (
    <div className={clsx('page', styles.pending)}>
      <h1 className="t-display">{link ? t(link.label) : t('site.notFound.title')}</h1>
      <p className="t-lead c-muted">{link ? t('site.pending') : t('site.notFound.body')}</p>
      {path === '/about' && <p id={CONTACT_ANCHOR} className="t-body">{t('site.contactLead')}<a className="c-main" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>}
      <ButtonLink to={BENCHMARKS_PATH} variant="line">{t('site.toBenchmarks')}</ButtonLink>
    </div>
  );
}

/** What a page shows when its data cannot be loaded or its address names nothing. */
export function PageError() {
  const { t } = useTranslation();
  const error = useRouteError();
  return (
    <div className={clsx('page', styles.pending)} role="alert">
      <h1 className="t-display">{t('site.error')}</h1>
      <p className="t-lead c-muted">{error instanceof Error ? error.message : String(error)}</p>
      <ButtonLink to={BENCHMARKS_PATH} variant="line">{t('site.toBenchmarks')}</ButtonLink>
    </div>
  );
}
