import { Suspense, useEffect, type ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router-dom';
import { I18N } from './i18n';
import { LocaleContext, useLocale } from './localeContext';
import { localizedPath, type Locale } from './locales';

/** The root of one locale's routes: its translations, its <html lang> and title, and scroll restoration for every page below. */
export function LocaleRoot({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = I18N[locale].t('site.title');
  }, [locale]);
  return (
    <LocaleContext.Provider value={locale}>
      <I18nextProvider i18n={I18N[locale]}>
        <Suspense fallback={null}><Outlet /></Suspense>
        <ScrollRestoration />
      </I18nextProvider>
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
