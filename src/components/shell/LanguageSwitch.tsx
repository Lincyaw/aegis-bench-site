import { useLocale } from '../../i18n/localeContext';
import { LOCALES, LOCALE_NAMES } from '../../i18n/locales';
import { ButtonLink } from '../../ui/controls';

/**
 * Links to the page being read, a site path and its search, in the other languages; a quiet control, since every bar
 * that holds it has its own pill.
 */
export function LanguageSwitch({ path, search }: { path: string; search: string }) {
  const locale = useLocale();
  return LOCALES.filter(other => other !== locale).map(other => (
    <ButtonLink key={other} variant="quiet" size="medium" to={`${path}${search}`} locale={other} hrefLang={other} lang={other}>{LOCALE_NAMES[other]}</ButtonLink>
  ));
}
