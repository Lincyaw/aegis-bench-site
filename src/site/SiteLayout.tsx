import { clsx } from 'clsx';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useMatches } from 'react-router-dom';
import { LocaleLink, LocaleNavLink } from '../i18n/LocaleRouting';
import { useLocale } from '../i18n/localeContext';
import { LOCALES, LOCALE_NAMES, localizedPath, sitePath } from '../i18n/locales';
import { CONSOLE_PATH } from '../console/consoleMap';
import { lobePath } from '../lifecycle/loop';
import { Loading } from '../ui/content';
import { IconButton } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { SectionLinks } from '../ui/navigation';
import { PageSectionsContext, type PageSections } from './pageSections';
import { CONTACT_PATH, FOOTER_LINKS, NAV_LINKS } from './siteMap';
import { toggleTheme } from './theme';
import styles from './SiteLayout.module.css';

/** Route handle of a page that fills the window below the nav and scrolls inside its own panes. */
export interface RouteHandle {
  fillsWindow?: boolean;
}

/** Every page but the landing page: the nav, the page, and the footer unless the page fills the window. */
export function SiteLayout() {
  const fillsWindow = useMatches().some(match => (match.handle as RouteHandle | undefined)?.fillsWindow);
  const [sections, setSections] = useState<PageSections | null>(null);
  return (
    <PageSectionsContext.Provider value={setSections}>
      <SiteNav sections={sections} />
      <main>
        <Suspense fallback={<div className="page"><Loading /></div>}><Outlet /></Suspense>
      </main>
      {!fillsWindow && <SiteFooter />}
    </PageSectionsContext.Provider>
  );
}

/** The ∞ mark: the development lobe and the operations lobe. */
export function BrandMark({ width = 38 }: { width?: number }) {
  const height = (width * 17) / 38;
  const a = width / 2 - 1;
  return (
    <svg className={styles.mark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={lobePath('dev', width / 2, height / 2, a, 48)} />
      <path d={lobePath('ops', width / 2, height / 2, a, 48)} />
    </svg>
  );
}

export function ThemeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
    </svg>
  );
}

export function MenuIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

/** Links to the page being read in the other languages. */
export function LanguageSwitch() {
  const locale = useLocale();
  const { pathname, search } = useLocation();
  const path = sitePath(locale, pathname);
  return LOCALES.filter(other => other !== locale).map(other => (
    <Link key={other} className={clsx(controls.pill, controls.medium, 'loop-edge')} to={`${localizedPath(other, path)}${search}`} hrefLang={other} lang={other}>{LOCALE_NAMES[other]}</Link>
  ));
}

/** Flush with the top edge at the top of a page; once the page scrolls it floats as a pill, always in reach. */
export function SiteNav({ sections }: { sections: PageSections | null }) {
  const { t } = useTranslation();
  const [floating, setFloating] = useState(false);
  useEffect(() => {
    const onScroll = () => setFloating(scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) {
    setOpen(false);
  }
  return (
    <header className={clsx(styles.nav, floating && styles.floating)}>
      <div className={styles.bar}>
        <div className={styles.start}>
          <LocaleLink className={styles.brand} to="/" aria-label={t('site.home')}><BrandMark /></LocaleLink>
          {sections ? (
            <nav className={styles.sectionNav} aria-label={t('site.pageSections')}><SectionLinks sections={sections.sections} current={sections.current} className={styles.sections} /></nav>
          ) : (
            <nav className={styles.links} aria-label={t('site.mainNav')}>
              {NAV_LINKS.map(link => <LocaleNavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? styles.current : undefined)}>{t(link.label)}</LocaleNavLink>)}
            </nav>
          )}
        </div>
        <div className={styles.end}>
          <LanguageSwitch />
          <IconButton label={t('site.toggleTheme')} onClick={toggleTheme}><ThemeIcon /></IconButton>
          <LocaleLink className={styles.signIn} to={CONSOLE_PATH}>{t('site.signIn')}</LocaleLink>
          <LocaleLink className={clsx(controls.pill, controls.medium, styles.contact, 'loop-edge')} to={CONTACT_PATH}>{t('site.contact')}</LocaleLink>
          <span className={styles.menuButton}>
            <IconButton label={t('site.openMenu')} expanded={open} onClick={() => { setOpen(!open); setOpenedAt(pathname); }}><MenuIcon /></IconButton>
          </span>
        </div>
      </div>
      {open && (
        <nav className={styles.drawer} aria-label={t('site.mainNav')}>
          {FOOTER_LINKS.map(link => <LocaleLink key={link.to} to={link.to} className="t-heading">{t(link.label)}</LocaleLink>)}
          <LocaleLink to={CONTACT_PATH} className="t-heading">{t('site.contact')}</LocaleLink>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <div className="page">
        <div className={styles.footerTop}>
          <LocaleLink className={styles.brand} to="/" aria-label={t('site.home')}><BrandMark /></LocaleLink>
          <span className="t-micro c-muted">{t('site.tagline')}</span>
        </div>
        <div className={styles.footerBottom}>
          <span className="t-micro c-faint">{t('site.footnote')}</span>
          <nav aria-label={t('site.footerNav')} className={styles.footerLinks}>
            {FOOTER_LINKS.map(link => <LocaleLink key={link.to} to={link.to} className="t-micro c-muted">{t(link.label)}</LocaleLink>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
