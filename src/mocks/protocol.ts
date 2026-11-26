import { getResponse, http as plainHttp, HttpResponse, type RequestHandler } from 'msw';
import Negotiator from 'negotiator';
import { createOpenApiHttp } from 'openapi-msw';
import { localeValues, type paths } from '../api/schema';
import { API_ROOT } from '../api/server';
import type { HuggingFaceUnreachableAnswer, Locale } from '../api/types';
import type { CombinationScope } from './catalog';
import { HuggingFaceReadError } from './records';

/*
 * The conventions the operations of the spec share: handlers typed by its paths, the reader's language, the
 * combinations a request keeps to, the pages of a list, and the answer when records kept on Hugging Face cannot be read.
 */

/** The status the spec's HuggingFaceUnreachableError answers with. */
export const HUGGING_FACE_UNREACHABLE_STATUS = 502;

/**
 * The operations, answering the spec's HuggingFaceUnreachableError when one of them needs records a benchmark keeps on
 * Hugging Face and the reader's network does not reach it. Any other failure stays the server's error.
 */
export function answeringUnreachableRecords(operations: RequestHandler[]) {
  return plainHttp.all(`${API_ROOT}/*`, async ({ request }) => {
    try {
      return await getResponse(operations, request, { baseUrl: new URL(request.url).origin });
    } catch (error) {
      if (!(error instanceof HuggingFaceReadError)) {
        throw error;
      }
      const body: HuggingFaceUnreachableAnswer = { message: error.message, huggingFaceUrl: error.page };
      return HttpResponse.json(body, { status: HUGGING_FACE_UNREACHABLE_STATUS });
    }
  });
}

/** Handlers typed by the API's paths: a path, parameter, status or body the spec does not declare fails to compile. */
export const http = createOpenApiHttp<paths>({ baseUrl: API_ROOT });

/** The locale the API answers in when the reader's languages match none it serves, as the spec declares. */
export const DEFAULT_LOCALE: Locale = 'zh-CN';

/** The locale to answer in: the best match for the request's Accept-Language among the locales the API serves. */
export function localeOf(request: Request): Locale {
  const negotiated = new Negotiator({ headers: { 'accept-language': request.headers.get('Accept-Language') ?? undefined } }).language([...localeValues]);
  return localeValues.find(locale => locale === negotiated) ?? DEFAULT_LOCALE;
}

/** The headers of a response written in a locale. */
export function writtenIn(locale: Locale) {
  return { headers: { 'Content-Language': locale } };
}

/** The combinations a request keeps to with the spec's CombinationScopeQuery parameters. */
export function combinationScopeOf(query: { get(name: 'model' | 'harness'): string | null }): CombinationScope {
  return { model: query.get('model') ?? '', harness: query.get('harness') ?? '' };
}

/** The page of a list a request asks for with the spec's PageQuery parameters, and the length of the whole list. */
export function pageOf<Item>(list: readonly Item[], query: { get(name: 'offset' | 'limit'): string | null }, defaultSize: number) {
  const offset = Number(query.get('offset') ?? 0);
  const limit = Number(query.get('limit') ?? defaultSize);
  return { items: list.slice(offset, offset + limit), total: list.length };
}
