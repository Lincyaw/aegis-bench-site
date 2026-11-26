import { Suspense, useEffect, useState, type ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { I18N } from './i18n';
import { LocaleContext, useLocale } from './localeContext';
import { localizedPath, sitePath, type Locale } from './locales';
import { TrailContext } from './trail';

/**
 * The root of one locale's routes: its translations, its <html lang> and title, scroll restoration for every page
 * below, and the trail of addresses the reader opened.
 */
export function LocaleRoot({ locale }: { locale: Locale }) {
  const [trail] = useState(() => new Map<string, string>());
  const { pathname, search } = useLocation();
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = I18N[locale].t('site.title');
  }, [locale]);
  useEffect(() => {
    const path = sitePath(locale, pathname);
    trail.set(path, `${path}${search}`);
  }, [trail, locale, pathname, search]);
  return (
    <LocaleContext.Provider value={locale}>
      <TrailContext.Provider value={trail}>
        <I18nextProvider i18n={I18N[locale]}>
          <Suspense fallback={null}><Outlet /></Suspense>
          <ScrollRestoration />
        </I18nextProvider>
      </TrailContext.Provider>
    </LocaleContext.Provider>
  );
}

/** A link to a site path, such as /benchmarks, in the current locale. */
export function LocaleLink({ to, ...props }: Omit<ComponentProps<typeof Link>, 'to'> & { to: string }) {
  return <Link to={localizedPath(useLocale(), to)} {...props} />;
}

export function LocaleNavLink({ to, ...props }: Omit<ComponentProps<typeof NavLink>, 'to'> & { to: string }) {
  return <NavLink to={localizedPath(useLocale(), to)} {...props} />;
}
