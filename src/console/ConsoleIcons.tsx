/** The console sidebar's icons: 16px line drawings in the text colour. */
export type NavIcon = 'overview' | 'tasks' | 'runs' | 'models';

export function NavIconOf({ icon }: { icon: NavIcon }) {
  switch (icon) {
    case 'overview':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
    case 'tasks':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M6 4h8M6 8h8M6 12h8" /><circle cx="2.75" cy="4" r=".75" fill="currentColor" /><circle cx="2.75" cy="8" r=".75" fill="currentColor" /><circle cx="2.75" cy="12" r=".75" fill="currentColor" /></svg>;
    case 'runs':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 2.75v10.5L13 8z" /></svg>;
    case 'models':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" /><path d="M6.5 1.75V4M9.5 1.75V4M6.5 12v2.25M9.5 12v2.25M1.75 6.5H4M1.75 9.5H4M12 6.5h2.25M12 9.5h2.25" /></svg>;
  }
}
