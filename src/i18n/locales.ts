export const LOCALES = ['zh-CN', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'zh-CN';

export function isLocale(value: string | undefined): value is Locale {
  return LOCALES.some(locale => locale === value);
}

/** The path prefix of each locale; the default locale lives at the root. */
export const LOCALE_PREFIX: Record<Locale, string> = { 'zh-CN': '', en: '/en' };

/** How each locale names itself in the language switch. */
export const LOCALE_NAMES: Record<Locale, string> = { 'zh-CN': '中文', en: 'EN' };

/** A small count as the locale writes it in running text: Chinese numerals in Chinese, digits otherwise. */
export function spelledNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN-u-nu-hanidec' : locale).format(value);
}

/** A site path, such as /benchmarks, as it is reached in the locale. */
export function localizedPath(locale: Locale, path: string): string {
  return path === '/' ? LOCALE_PREFIX[locale] || '/' : `${LOCALE_PREFIX[locale]}${path}`;
}

/** The site path of a location in the locale: its pathname without the locale's prefix. */
export function sitePath(locale: Locale, pathname: string): string {
  return pathname.slice(LOCALE_PREFIX[locale].length) || '/';
}
