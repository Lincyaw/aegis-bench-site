import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { DATA_DIRECTORY, openRecords } from './records';

// The data directory is published with the site, under the build's base; a file kept elsewhere is named by its URL.
const dataDirectory = new URL(`${import.meta.env.BASE_URL}${DATA_DIRECTORY}/`, window.location.href);
await openRecords(async path => {
  const url = new URL(path, dataDirectory);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url.href} answered ${response.status}`);
  }
  return response.text();
});

/*
 * During development every exchange is checked against the spec; the published demo answers without the check, so
 * the validator stays out of its bundle.
 */
export const worker = setupWorker(...(import.meta.env.DEV ? [(await import('./contract')).contractHandler(handlers)] : handlers));
