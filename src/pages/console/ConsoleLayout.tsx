import * as Popover from '@radix-ui/react-popover';
import { clsx } from 'clsx';
import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useMatches } from 'react-router-dom';
import { useConsoleBenchmarks, useConsoleSession, useSettings, useSignOut } from '../../api/consoleClient';
import type { ConsoleUser } from '../../api/types';
import { BrandMark } from '../../components/shell/BrandMark';
import { LanguageSwitch } from '../../components/shell/LanguageSwitch';
import { NavIconOf } from '../../components/shell/NavIcons';
import { LocaleLink, LocaleNavigate } from '../../i18n/LocaleRouting';
import { useLocale, useLocalizedNavigate } from '../../i18n/localeContext';
import { groupedNumber, sitePath } from '../../i18n/locales';
import { CONSOLE_PATH, benchmarkSectionOf, benchmarkSectionPath, signInPath } from '../../routes/console';
import { benchmarkPath } from '../../routes/site';
import { Loading } from '../../ui/content';
import { Button, IconButton, MenuIcon, Select, ThemeIcon } from '../../ui/controls';
import controls from '../../ui/controls.module.css';
import { toggleTheme } from '../../ui/theme';
import { BENCHMARK_NAV, WORKSPACE_CHOICE, WORKSPACE_NAV } from './consoleNav';
import styles from './ConsoleLayout.module.css';

/**
 * Every console page but the sign-in page: the bar along the top, the sidebar of the benchmark being read and the page.
 * A browser that has signed out goes to the sign-in page, which brings it back here.
 */
export function ConsoleLayout() {
  const session = useConsoleSession();
  const locale = useLocale();
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const benchmarkId = useMatches().at(-1)?.params.benchmarkId;
  if (!session.user) {
    return <LocaleNavigate replace to={signInPath(`${sitePath(locale, pathname)}${search}`)} />;
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
  const locale = useLocale();
  const { pathname, search } = useLocation();
  return (
    <header className={styles.bar}>
      <span className={styles.menuButton}><IconButton label={t('console.openMenu')} expanded={menuOpen} onClick={onMenu}><MenuIcon /></IconButton></span>
      <LocaleLink className={styles.brand} to={CONSOLE_PATH} aria-label={t('console.home')}>
        <BrandMark />
        <span className="t-small c-muted">{t('console.name')}</span>
      </LocaleLink>
      <div className={styles.end}>
        <LocaleLink className={clsx(controls.pill, controls.medium, controls.quiet, styles.publicSite)} to={benchmarkId ? benchmarkPath(benchmarkId) : '/'}>{t('console.publicSite')}</LocaleLink>
        <LanguageSwitch path={sitePath(locale, pathname)} search={search} />
        <IconButton label={t('site.toggleTheme')} onClick={toggleTheme} variant="quiet"><ThemeIcon /></IconButton>
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
          <span className="t-label">{user.name}</span>
          <span className="t-mono c-muted">{user.account} · {t(`console.roles.${user.role}`)}</span>
          <Button variant="line" onClick={() => signOut.mutate()}>{t('console.account.signOut')}</Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The workspace or the benchmark being read, which another can replace in the same section, and its pages. On a narrow
 * screen it is a drawer, which any choice closes.
 */
export function ConsoleSidebar({ benchmarkId, open, onNavigate }: { benchmarkId: string | undefined; open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const benchmarks = useConsoleBenchmarks();
  const { workspace } = useSettings();
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const path = sitePath(locale, useLocation().pathname);
  const current = benchmarkSectionOf(path);
  const benchmark = benchmarks.find(candidate => candidate.id === benchmarkId);
  return (
    <nav className={styles.sidebar} data-state={open ? 'open' : 'closed'} aria-label={t('console.mainNav')}>
      <Select
        label={t('console.context')}
        className={styles.context}
        choices={[{ value: WORKSPACE_CHOICE, label: workspace.name }, ...benchmarks.map(entry => ({ value: entry.id, label: `${entry.name} · ${entry.stage.name}` }))]}
        value={benchmarkId ?? WORKSPACE_CHOICE}
        onChange={next => { navigate(next === WORKSPACE_CHOICE ? CONSOLE_PATH : benchmarkSectionPath(next, benchmarkId ? current : '')); onNavigate(); }}
      />
      {!benchmarkId && WORKSPACE_NAV.map(group => (
        <div key={group.label ?? ''} className={styles.group}>
          {group.label && <span className={clsx(styles.groupLabel, 't-micro c-faint')}>{t(group.label)}</span>}
          <ul className={styles.items}>
            {group.sections.map(item => (
              <li key={item.path}>
                <LocaleLink className={styles.item} to={item.path} aria-current={item.path === path ? 'page' : undefined} onClick={onNavigate}>
                  <NavIconOf icon={item.icon} />
                  <span className="t-label">{t(item.label)}</span>
                </LocaleLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {benchmarkId && (
        <>
          {BENCHMARK_NAV.map(group => (
            <div key={group.label ?? ''} className={styles.group}>
              {group.label && <span className={clsx(styles.groupLabel, 't-micro c-faint')}>{t(group.label)}</span>}
              <ul className={styles.items}>
                {group.sections.map(item => (
                  <li key={item.section}>
                    <LocaleLink className={styles.item} to={benchmarkSectionPath(benchmarkId, item.section)} aria-current={item.section === current ? 'page' : undefined} onClick={onNavigate}>
                      <NavIconOf icon={item.icon} />
                      <span className="t-label">{t(item.label)}</span>
                      {item.count && benchmark && <span className="t-micro c-faint">{groupedNumber(locale, item.count(benchmark))}</span>}
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </nav>
  );
}
