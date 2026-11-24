import { createContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Mark, TabIndicator, Wordmark } from './ui';
import styles from './SiteChrome.module.css';

const SECTIONS = [
  { to: '/leaderboard', label: '排行榜' },
  { to: '/benchmarks', label: '评测基准' },
  { to: '/reports', label: '研究报告' },
  { to: '/about', label: '关于我们' },
];

const FOOTER_LINKS = [...SECTIONS, { to: '/methodology', label: '评测方法' }, { to: '/changelog', label: '更新日志' }];

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('aegis-theme', next);
  } catch {
    // Private windows may refuse storage; the theme still applies to this page.
  }
}

function ThemeToggle() {
  return (
    <button type="button" className={`${styles.iconButton} loop-edge`} onClick={toggleTheme} aria-label="切换深色或浅色主题">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  );
}

/** The section links of the page being read, which the floating nav shows once the page's own section bar has scrolled away. */
export interface PageSections { items: { id: string; label: string }[]; current: string }

export const NavSectionsContext = createContext<(sections: PageSections | null) => void>(() => undefined);

/** Flush with the top edge at the top of a page; once the page scrolls it floats as a pill, always in reach. */
export function SiteNav({ sections }: { sections: PageSections | null }) {
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
    <header className={`${styles.nav} ${floating ? styles.floating : ''}`}>
      <div className={styles.bar}>
        <div className={styles.start}>
          <Link className={styles.brand} to="/" aria-label="Aegis Bench 首页"><Mark />{!sections && <Wordmark />}</Link>
          {sections ? (
            <nav className={`${styles.sections} t-small`} aria-label="本页分区">
              {sections.items.map(item => <a key={item.id} href={`#${item.id}`} aria-current={item.id === sections.current ? 'true' : undefined}>{item.label}</a>)}
              <TabIndicator selected={sections.current} />
            </nav>
          ) : (
            <nav className={styles.links} aria-label="主导航">
              {SECTIONS.map(section => (
                <NavLink key={section.to} to={section.to} className={({ isActive }) => (isActive ? styles.current : undefined)}>{section.label}</NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className={styles.end}>
          <ThemeToggle />
          <Link className={`${styles.contact} loop-edge`} to="/about#contact">联系我们</Link>
          <button type="button" className={`${styles.iconButton} ${styles.menuButton} loop-edge`} aria-expanded={open} aria-label="打开导航" onClick={() => { setOpen(!open); setOpenedAt(pathname); }}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className={styles.drawer} aria-label="主导航">
          {FOOTER_LINKS.map(section => <NavLink key={section.to} to={section.to} className="t-heading">{section.label}</NavLink>)}
          <Link to="/about#contact" className="t-heading">联系我们</Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className="page">
        <div className={styles.footerTop}>
          <Link className={styles.brand} to="/"><Mark /><Wordmark /></Link>
          <span className="t-micro c-muted">覆盖软件工程全生命周期的智能体评测</span>
        </div>
        <div className={styles.footerBottom}>
          <span className="t-micro c-faint">© 2026 Aegis Bench · 设计演示：评测基准、模型与数值均为占位内容</span>
          <nav aria-label="页脚" className={styles.footerLinks}>
            {FOOTER_LINKS.map(link => <Link key={link.to} to={link.to} className="t-micro c-muted">{link.label}</Link>)}
          </nav>
        </div>
      </div>
    </footer>
  );
}
