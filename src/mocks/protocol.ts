import Negotiator from 'negotiator';
import { createOpenApiHttp } from 'openapi-msw';
import { localeValues, type paths } from '../api/schema';
import { API_ROOT } from '../api/server';
import type { Locale } from '../api/types';

/*
 * The conventions every operation of the spec shares: handlers typed by its paths, the reader's language and the pages
 * of a list.
 */

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

/** The page of a list a request asks for with the spec's PageQuery parameters, and the length of the whole list. */
export function pageOf<Item>(list: readonly Item[], query: { get(name: 'offset' | 'limit'): string | null }, defaultSize: number) {
  const offset = Number(query.get('offset') ?? 0);
  const limit = Number(query.get('limit') ?? defaultSize);
  return { items: list.slice(offset, offset + limit), total: list.length };
}
