import { clsx } from 'clsx';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useMatches } from 'react-router-dom';
import type { PageSections } from '../../components/benchmark/SectionBar';
import { BrandLink } from '../../components/shell/BrandMark';
import { LanguageSwitch } from '../../components/shell/LanguageSwitch';
import { SiteFooter } from '../../components/shell/SiteFooter';
import { LocaleLink, LocaleNavLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { sitePath } from '../../i18n/locales';
import { CONSOLE_PATH } from '../../routes/console';
import { CONTACT_PATH } from '../../routes/site';
import { Loading } from '../../ui/content';
import { IconButton, MenuIcon, ThemeIcon } from '../../ui/controls';
import controls from '../../ui/controls.module.css';
import { SectionLinks } from '../../ui/navigation';
import { toggleTheme } from '../../ui/theme';
import { PageSectionsContext } from './pageSections';
import { FOOTER_LINKS, NAV_LINKS } from './siteNav';
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
      {!fillsWindow && <SiteFooter links={FOOTER_LINKS} />}
    </PageSectionsContext.Provider>
  );
}

/** Flush with the top edge at the top of a page; once the page scrolls it floats as a pill, always in reach. */
export function SiteNav({ sections }: { sections: PageSections | null }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { pathname, search } = useLocation();
  const [floating, setFloating] = useState(false);
  useEffect(() => {
    const onScroll = () => setFloating(scrollY > 8);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) {
    setOpen(false);
  }
  return (
    <header className={clsx(styles.nav, floating && styles.floating)}>
      <div className={styles.bar}>
        <div className={styles.start}>
          <BrandLink />
          {sections ? (
            <nav className={styles.sectionNav} aria-label={t('site.pageSections')}><SectionLinks sections={sections.sections} current={sections.current} className={styles.sections} /></nav>
          ) : (
            <nav className={styles.links} aria-label={t('site.mainNav')}>
              {NAV_LINKS.map(link => <LocaleNavLink key={link.to} to={link.to}>{t(link.label)}</LocaleNavLink>)}
            </nav>
          )}
        </div>
        <div className={styles.end}>
          <LanguageSwitch path={sitePath(locale, pathname)} search={search} />
          <IconButton label={t('site.toggleTheme')} onClick={toggleTheme} variant="quiet"><ThemeIcon /></IconButton>
          <LocaleLink className={clsx(controls.pill, controls.medium, controls.quiet)} to={CONSOLE_PATH}>{t('site.signIn')}</LocaleLink>
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
