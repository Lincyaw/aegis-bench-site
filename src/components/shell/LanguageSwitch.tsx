import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { useLocale } from '../../i18n/localeContext';
import { LOCALES, LOCALE_NAMES, localizedPath } from '../../i18n/locales';
import controls from '../../ui/controls.module.css';

/**
 * Links to the page being read, a site path and its search, in the other languages; a quiet control, since every bar
 * that holds it has its own pill.
 */
export function LanguageSwitch({ path, search }: { path: string; search: string }) {
  const locale = useLocale();
  return LOCALES.filter(other => other !== locale).map(other => (
    <Link key={other} className={clsx(controls.pill, controls.medium, controls.quiet)} to={`${localizedPath(other, path)}${search}`} hrefLang={other} lang={other}>{LOCALE_NAMES[other]}</Link>
  ));
}
