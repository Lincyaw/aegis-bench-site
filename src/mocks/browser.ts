import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { DATA_DIRECTORY, openRecords } from './records';

// The data directory is published with the site, under the build's base.
await openRecords(async path => {
  const response = await fetch(`${import.meta.env.BASE_URL}${DATA_DIRECTORY}/${path}`);
  if (!response.ok) {
    throw new Error(`${DATA_DIRECTORY}/${path} answered ${response.status}`);
  }
  return response.text();
});

/*
 * During development every exchange is checked against the spec; the published demo answers without the check, so
 * the validator stays out of its bundle.
 */
export const worker = setupWorker(...(import.meta.env.DEV ? [(await import('./contract')).contractHandler(handlers)] : handlers));
