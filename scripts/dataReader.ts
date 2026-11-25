import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import type { DataReader } from '../src/mocks/records';

/** The status of an answer that asks to come back later, after the seconds its Retry-After header gives. */
export const TOO_MANY_REQUESTS = 429;

/** A file's answer from another host; an answer asking to come back later is waited out, as its Retry-After says. */
export async function fetchWaitingOutLimits(url: URL): Promise<Response> {
  const response = await fetch(url);
  if (response.status !== TOO_MANY_REQUESTS) {
    return response;
  }
  const seconds = Number(response.headers.get('Retry-After'));
  if (!Number.isFinite(seconds)) {
    throw new Error(`${url.href} answered ${TOO_MANY_REQUESTS} without saying when to come back`);
  }
  await setTimeout(seconds * 1000);
  return fetchWaitingOutLimits(url);
}

/** Reads the data directory at a file URL from disk, and a file kept elsewhere from its URL. */
export function dataReaderAt(directory: URL): DataReader {
  return async path => {
    const url = new URL(path, directory);
    if (url.protocol === 'file:') {
      return readFile(url, 'utf8');
    }
    const response = await fetchWaitingOutLimits(url);
    if (!response.ok) {
      throw new Error(`${url.href} answered ${response.status}`);
    }
    return response.text();
  };
}
