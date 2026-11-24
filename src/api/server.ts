import openapi from './openapi.json';

/** Where the API is served, as the spec's @server declares: the client calls it there and the mock server answers there. */
export const API_ROOT = openapi.servers[0].url;
