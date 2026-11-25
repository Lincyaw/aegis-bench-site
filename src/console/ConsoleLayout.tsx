import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router-dom';
import { useConsoleBenchmarks, useConsoleSession, useSignOut } from '../api/consoleClient';
import type { ConsoleUser } from '../api/types';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../i18n/localeContext';
import { groupedNumber, localizedPath, sitePath } from '../i18n/locales';
import { BrandMark, LanguageSwitch, MenuIcon, ThemeIcon } from '../site/SiteLayout';
import { benchmarkPath } from '../site/siteMap';
import { toggleTheme } from '../site/theme';
import { Loading } from '../ui/content';
import { Button, IconButton, Select } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { NavIconOf } from './ConsoleIcons';
import { BENCHMARK_SECTIONS, benchmarkSectionOf, benchmarkSectionPath, signInPath } from './consoleMap';
import styles from './ConsoleLayout.module.css';

/**
 * Every console page but the sign-in page: the bar along the top, the sidebar of the benchmark being read and the page.
 * A browser that is not signed in goes to the sign-in page, which brings it back here.
 */
export function ConsoleLayout() {
  const session = useConsoleSession();
  const locale = useLocale();
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const benchmarkId = useMatches().at(-1)?.params.benchmarkId;
  if (!session.user) {
    return <Navigate replace to={localizedPath(locale, signInPath(`${sitePath(locale, pathname)}${search}`))} />;
  }
  return (
    <div className={styles.console}>
      <ConsoleBar user={session.user} benchmarkId={benchmarkId} menuOpen={menuOpen} onMenu={() => setMenuOpen(!menuOpen)} />
      <ConsoleSidebar benchmarkId={benchmarkId} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main className={styles.main}>
        <Suspense fallback={<Loading />}><Outlet /></Suspense>
      </main>
    </div>
  );
}

export function ConsoleBar({ user, benchmarkId, menuOpen, onMenu }: { user: ConsoleUser; benchmarkId: string | undefined; menuOpen: boolean; onMenu: () => void }) {
  const { t } = useTranslation();
  return (
    <header className={styles.bar}>
      <span className={styles.menuButton}><IconButton label={t('console.openMenu')} expanded={menuOpen} onClick={onMenu}><MenuIcon /></IconButton></span>
      <LocaleLink className={styles.brand} to="/console" aria-label={t('console.home')}>
        <BrandMark />
        <span className={clsx('t-wordmark', styles.wordmark)}>AEGIS</span>
        <span className="t-small c-muted">{t('console.name')}</span>
      </LocaleLink>
      <div className={styles.end}>
        <LocaleLink className={clsx(controls.pill, controls.medium, styles.publicSite, 'loop-edge')} to={benchmarkId ? benchmarkPath(benchmarkId) : '/'}>{t('console.publicSite')}</LocaleLink>
        <LanguageSwitch />
        <IconButton label={t('site.toggleTheme')} onClick={toggleTheme}><ThemeIcon /></IconButton>
        <AccountMenu user={user} />
      </div>
    </header>
  );
}

/** The account's initials; they open the account and the way to sign out. */
export function AccountMenu({ user }: { user: ConsoleUser }) {
  const { t } = useTranslation();
  const signOut = useSignOut();
  return (
    <Popover.Root>
      <Popover.Trigger className={clsx(controls.pill, controls.icon, styles.avatar, 'loop-edge')} aria-label={t('console.account.menu', { account: user.account })}>
        <span className="t-label">{user.initials}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className={styles.accountMenu} align="end" sideOffset={8} collisionPadding={12}>
          <span className="t-micro c-faint">{t('console.account.signedInAs')}</span>
          <span className="t-label">{user.account}</span>
          <Button variant="line" onClick={() => signOut.mutate()}>{t('console.account.signOut')}</Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The benchmark being read, which another can replace in the same section, and that benchmark's sections. On a narrow
 * screen it is a drawer, which any choice closes.
 */
export function ConsoleSidebar({ benchmarkId, open, onNavigate }: { benchmarkId: string | undefined; open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const benchmarks = useConsoleBenchmarks();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const path = sitePath(locale, useLocation().pathname);
  const current = benchmarkSectionOf(path);
  const benchmark = benchmarks.find(candidate => candidate.id === benchmarkId);
  return (
    <nav className={clsx(styles.sidebar, open && styles.open)} aria-label={t('console.mainNav')}>
      {benchmarkId && (
        <>
          <Select
            label={t('console.context')}
            className={styles.context}
            choices={benchmarks.map(benchmark => ({ value: benchmark.id, label: `${benchmark.name} · ${benchmark.stage.name}` }))}
            value={benchmarkId}
            onChange={next => { navigate(benchmarkSectionPath(next, current)); onNavigate(); }}
          />
          <ul className={styles.items}>
            {BENCHMARK_SECTIONS.map(item => (
              <li key={item.section}>
                <LocaleLink className={styles.item} to={benchmarkSectionPath(benchmarkId, item.section)} aria-current={item.section === current ? 'page' : undefined} onClick={onNavigate}>
                  <NavIconOf icon={item.icon} />
                  <span className="t-label">{t(item.label)}</span>
                  {item.count && benchmark && <span className="t-micro c-faint">{groupedNumber(locale, benchmark[item.count])}</span>}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
