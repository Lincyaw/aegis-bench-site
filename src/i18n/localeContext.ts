import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_LOCALE, localizedPath, type Locale } from './locales';

/** The locale of the route being shown; the locale roots of the router provide it. */
export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Navigates to a site path in the current locale. */
export function useLocalizedNavigate(): (path: string) => void {
  const locale = useLocale();
  const navigate = useNavigate();
  return path => navigate(localizedPath(locale, path));
}
