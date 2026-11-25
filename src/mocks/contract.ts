import addFormats from 'ajv-formats';
import { dereferenceSync } from 'dereference-json-schema/dereference.js';
import { getResponse, http, HttpResponse, type RequestHandler } from 'msw';
import { SetMatchType, type Document } from 'openapi-backend/backend';
import { OpenAPIRouter, type Request as ApiRequest } from 'openapi-backend/router';
import { OpenAPIValidator } from 'openapi-backend/validation';
import openapi from '../api/openapi.json';
import { API_ROOT } from '../api/server';

/*
 * The contract the mock server keeps: openapi-backend's router and validator over the spec's document. They are built
 * directly rather than through OpenAPIBackend, whose start-up parses the document with a Node-only reference parser,
 * and imported from the modules that define them, since the packages' index modules re-export them in a form only
 * Node can import by name.
 */

/** The spec's document with every reference resolved; TypeSpec wrote it, and its JSON module types widen enums to string. */
export const DEFINITION = dereferenceSync(openapi) as Document;

/** Matches a request to the operation the spec declares for it. */
export const router = new OpenAPIRouter({ definition: DEFINITION, apiRoot: API_ROOT });

/** Checks requests and responses against their operations, formats such as dates included. */
export const validator = new OpenAPIValidator({ definition: DEFINITION, router, lazyCompileValidators: true, customizeAjv: ajv => addFormats(ajv) });

/** A fetch request as openapi-backend reads it; every request body the spec declares is JSON. */
export async function apiRequestOf(request: Request): Promise<ApiRequest> {
  const url = new URL(request.url);
  // A request without a body may still carry an empty stream, as Node's requests do.
  const text = await request.clone().text();
  return {
    method: request.method, path: url.pathname, query: url.search.slice(1), headers: Object.fromEntries(request.headers),
    ...(text && { body: JSON.parse(text) as unknown }),
  };
}

/**
 * The mock server's single entry: it hands a request to the implementation only when the request follows the spec,
 * and passes the answer on only when the answer follows it too. Anything else comes back as an error that names the
 * operation and lists what broke the contract.
 */
export function contractHandler(implementation: RequestHandler[]) {
  return http.all(`${API_ROOT}/*`, async ({ request }) => {
    const apiRequest = await apiRequestOf(request);
    const operation = router.matchOperation(apiRequest);
    if (!operation) {
      return HttpResponse.json({ message: `the API declares no ${apiRequest.method} ${apiRequest.path}` }, { status: 404 });
    }
    const requestCheck = validator.validateRequest(apiRequest, operation);
    if (!requestCheck.valid) {
      return HttpResponse.json({ message: `the request does not follow ${operation.operationId}`, errors: requestCheck.errors }, { status: 400 });
    }
    // The handlers' paths are relative to the API's origin, which only the browser would otherwise supply.
    const response = await getResponse(implementation, request.clone(), { baseUrl: new URL(request.url).origin });
    if (!response) {
      throw new Error(`the mock server does not implement ${operation.operationId}`);
    }
    const bodyCheck = validator.validateResponse(await response.clone().json(), operation, response.status);
    const headerCheck = validator.validateResponseHeaders(Object.fromEntries(response.headers), operation, { statusCode: response.status, setMatchType: SetMatchType.Superset });
    const errors = [...(bodyCheck.errors ?? []), ...(headerCheck.errors ?? [])];
    if (errors.length > 0) {
      return HttpResponse.json({ message: `the mock's response does not follow ${operation.operationId}`, errors }, { status: 500 });
    }
    return response;
  });
}
