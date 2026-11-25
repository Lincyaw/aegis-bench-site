/** The console sidebar's icons: 16px line drawings in the text colour. */
export type NavIcon = 'overview';

export function NavIconOf({ icon }: { icon: NavIcon }) {
  switch (icon) {
    case 'overview':
      return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
  }
}
