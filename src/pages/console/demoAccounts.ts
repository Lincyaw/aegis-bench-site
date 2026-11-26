import type { Role } from '../../api/types';

/** The demo's mock server lets every member in with this password; the sign-in page and the invitation form say so. */
export const DEMO_PASSWORD = 'demo';

/** The accounts the sign-in page suggests for the demo, one per role; the mock server decides which one the demo opens signed in as. */
export const DEMO_ACCOUNTS: { account: string; role: Role }[] = [
  { account: 'lin.fang', role: 'admin' },
  { account: 'zhou.yu', role: 'editor' },
  { account: 'he.ming', role: 'viewer' },
];
