import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Mark, Wordmark } from './ui';
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
    <button type="button" className={styles.iconButton} onClick={toggleTheme} aria-label="切换深色或浅色主题">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
    </button>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) {
    setOpen(false);
  }
  return (
    <header className={styles.nav}>
      <div className={styles.start}>
        <Link className={styles.brand} to="/" aria-label="Aegis Bench 首页"><Mark /><Wordmark /></Link>
        <nav className={styles.links} aria-label="主导航">
          {SECTIONS.map(section => (
            <NavLink key={section.to} to={section.to} className={({ isActive }) => (isActive ? styles.current : undefined)}>{section.label}</NavLink>
          ))}
        </nav>
      </div>
      <div className={styles.end}>
        <ThemeToggle />
        <Link className={styles.contact} to="/about#contact">联系我们</Link>
        <button type="button" className={`${styles.iconButton} ${styles.menuButton}`} aria-expanded={open} aria-label="打开导航" onClick={() => { setOpen(!open); setOpenedAt(pathname); }}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
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
