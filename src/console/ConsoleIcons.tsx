/** The console sidebar's icons: 16px line drawings in the text colour. */
export type NavIcon = 'overview' | 'tasks';

export function NavIconOf({ icon }: { icon: NavIcon }) {
  switch (icon) {
    case 'overview':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
    case 'tasks':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M6 4h8M6 8h8M6 12h8" /><circle cx="2.75" cy="4" r=".75" fill="currentColor" /><circle cx="2.75" cy="8" r=".75" fill="currentColor" /><circle cx="2.75" cy="12" r=".75" fill="currentColor" /></svg>;
  }
}
