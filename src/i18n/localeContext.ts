import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { localizedPath, type Locale } from './locales';

/** The locale of the route being shown; the locale roots of the router provide it. */
export const LocaleContext = createContext<Locale | null>(null);

export function useLocale(): Locale {
  const locale = useContext(LocaleContext);
  if (!locale) {
    throw new Error('A locale is read inside a locale root, which provides it');
  }
  return locale;
}

/** Navigates to a site path in the current locale. */
export function useLocalizedNavigate(): (path: string) => void {
  const locale = useLocale();
  const navigate = useNavigate();
  return path => navigate(localizedPath(locale, path));
}
