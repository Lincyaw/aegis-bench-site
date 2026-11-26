import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../../i18n/LocaleRouting';
import type { Messages } from '../../i18n/zh';
import { BrandLink } from './BrandMark';
import styles from './SiteFooter.module.css';

/** A page the footer lists; its label is a message key of the site's nav. */
export interface FooterLink {
  to: string;
  label: `site.nav.${keyof Messages['site']['nav']}`;
}

export function SiteFooter({ links }: { links: readonly FooterLink[] }) {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <div className="page">
        <div className={styles.footerTop}>
          <BrandLink />
          <span className="t-micro c-muted">{t('site.tagline')}</span>
        </div>
        <div className={styles.footerBottom}>
          <span className="t-micro c-faint">{t('site.footnote')}</span>
          <nav aria-label={t('site.footerNav')} className={styles.footerLinks}>
            {links.map(link => <LocaleLink key={link.to} to={link.to} className="t-micro c-muted">{t(link.label)}</LocaleLink>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
