import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/*
 * During development every exchange is checked against the spec; the published demo answers without the check, so
 * the validator stays out of its bundle.
 */
export const worker = setupWorker(...(import.meta.env.DEV ? [(await import('./contract')).contractHandler(handlers)] : handlers));
