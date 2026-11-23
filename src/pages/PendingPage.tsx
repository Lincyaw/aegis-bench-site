import { useLocation } from 'react-router-dom';
import { ButtonLink } from '../components/ui';

const TITLES: Record<string, string> = {
  '/reports': '研究报告',
  '/about': '关于我们',
  '/methodology': '评测方法',
  '/changelog': '更新日志',
};

/** Sections the design has not drawn yet; the contact address is the one thing the about page already needs. */
export function PendingPage() {
  const { pathname } = useLocation();
  return (
    <div className="page" style={{ paddingTop: 96, display: 'grid', gap: 16, justifyItems: 'start' }}>
      <h1 className="t-display">{TITLES[pathname] ?? '页面不存在'}</h1>
      <p className="t-lead c-muted">{TITLES[pathname] ? '该页面尚在设计中。' : '没有找到这个地址对应的页面。'}</p>
      {pathname === '/about' && <p id="contact" className="t-body">联系我们：<a className="c-main" href="mailto:contact@aegis-bench.org">contact@aegis-bench.org</a></p>}
      <ButtonLink to="/benchmarks">查看评测基准</ButtonLink>
    </div>
  );
}
