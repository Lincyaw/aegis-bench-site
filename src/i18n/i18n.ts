import i18next, { type i18n } from 'i18next';
import { en } from './en';
import { LOCALES, type Locale } from './locales';
import { zh, type Messages } from './zh';

const MESSAGES: Record<Locale, Messages> = { 'zh-CN': zh, en };

function i18nOf(locale: Locale): i18n {
  const instance = i18next.createInstance();
  // With initAsync off the instance is ready when init returns; its promise only repeats that.
  void instance.init({ lng: locale, resources: { [locale]: { translation: MESSAGES[locale] } }, interpolation: { escapeValue: false }, initAsync: false });
  return instance;
}

/** One i18next instance per locale, so a page renders in its locale from the first frame. */
export const I18N = Object.fromEntries(LOCALES.map(locale => [locale, i18nOf(locale)])) as Record<Locale, i18n>;
