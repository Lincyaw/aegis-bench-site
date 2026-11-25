import { serve } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { getResponse } from 'msw';
import { readFile } from 'node:fs/promises';
import openapi from '../src/api/openapi.json';
import { API_ROOT } from '../src/api/server';
import { contractHandler } from '../src/mocks/contract';
import { handlers } from '../src/mocks/handlers';
import { DATA_DIRECTORY, openRecords } from '../src/mocks/records';

/*
 * The mock server outside the browser: the same handlers behind the same contract, reachable with curl or from the
 * API's documentation page, so the spec can be tried out on its own.
 */

export const MOCK_HOST = '127.0.0.1';
export const MOCK_PORT = 4010;
export const OPENAPI_PATH = '/openapi.json';
export const DOCS_PATH = '/docs';

// The site's public directory holds the data directory the build publishes; a file kept elsewhere is named by its URL.
const dataDirectory = new URL(`../public/${DATA_DIRECTORY}/`, import.meta.url);
await openRecords(async path => {
  const url = new URL(path, dataDirectory);
  if (url.protocol === 'file:') {
    return readFile(url, 'utf8');
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url.href} answered ${response.status}`);
  }
  return response.text();
});

const mockServer = [contractHandler(handlers)];
const app = new Hono();
app.get(OPENAPI_PATH, context => context.json(openapi));
app.get(DOCS_PATH, swaggerUI({ url: OPENAPI_PATH }));
app.all(`${API_ROOT}/*`, async context => {
  const response = await getResponse(mockServer, context.req.raw, { baseUrl: new URL(context.req.url).origin });
  if (!response) {
    throw new Error(`the contract handler left ${context.req.url} unanswered`);
  }
  return response;
});
serve({ fetch: app.fetch, hostname: MOCK_HOST, port: MOCK_PORT }, () => {
  console.log(`API: http://${MOCK_HOST}:${MOCK_PORT}${API_ROOT}  documentation: http://${MOCK_HOST}:${MOCK_PORT}${DOCS_PATH}`);
});
