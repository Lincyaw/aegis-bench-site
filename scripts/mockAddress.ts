/** Where `npm run mock` listens, and where the dev and preview servers forward the API outside a secure context. */
export const MOCK_HOST = '127.0.0.1';
export const MOCK_PORT = 4010;
export const MOCK_ORIGIN = `http://${MOCK_HOST}:${MOCK_PORT}`;
