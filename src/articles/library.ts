import type { Toc } from '@stefanprobst/rehype-extract-toc';
import type { MDXContent } from 'mdx/types';
import { lazy, type LazyExoticComponent } from 'react';
import type { z } from 'zod';
import { ReportFrontmatter } from '../api/reportFrontmatter';
import { isLocale, type Locale } from '../i18n/locales';
import type { PageSection } from '../ui/navigation';

/**
 * The site's editorial documents: one body per benchmark page and one per report, each in every language, at
 * content/benchmarks/<benchmark>/<locale>.mdx and content/reports/<slug>/<locale>.md or .mdx.
 */
const DOCUMENT_LOADERS = import.meta.glob<MDXContent>(['/content/benchmarks/*/*.mdx', '/content/reports/*/*.{md,mdx}'], { import: 'default' });
const DOCUMENT_HEADINGS = import.meta.glob<Toc>(['/content/benchmarks/*/*.mdx', '/content/reports/*/*.{md,mdx}'], { import: 'tableOfContents', eager: true });
const REPORT_FRONTMATTER = import.meta.glob<unknown>('/content/reports/*/*.{md,mdx}', { import: 'frontmatter', eager: true });
const REPORT_PATH = /^\/content\/reports\/([^/]+)\/([^/]+)\.mdx?$/;

/** Each document as a component that loads on first render; the page suspends meanwhile. */
export const DOCUMENTS: Record<string, LazyExoticComponent<MDXContent>> = Object.fromEntries(
  Object.entries(DOCUMENT_LOADERS).map(([path, load]) => [path, lazy(async () => ({ default: await load() }))]),
);

export type ReportEntry = z.infer<typeof ReportFrontmatter> & { slug: string; locale: Locale; path: string };

/** Every report in every language, newest first. */
export const REPORTS: ReportEntry[] = Object.entries(REPORT_FRONTMATTER).map(([path, frontmatter]) => {
  const [, slug, locale] = path.match(REPORT_PATH) ?? [];
  if (!slug || !isLocale(locale)) {
    throw new Error(`${path} is not at content/reports/<slug>/<locale>.md or .mdx`);
  }
  return { ...ReportFrontmatter.parse(frontmatter), slug, locale, path };
}).sort((a, b) => b.date.localeCompare(a.date));

export function reportsIn(locale: Locale): ReportEntry[] {
  return REPORTS.filter(report => report.locale === locale);
}

export function reportOf(slug: string, locale: Locale): ReportEntry {
  const report = REPORTS.find(candidate => candidate.slug === slug && candidate.locale === locale);
  if (!report) {
    throw new Error(`no report ${slug} in ${locale}`);
  }
  return report;
}

/** Each report document's text as its file holds it, read on demand, such as when the console revises the report. */
const REPORT_SOURCE_LOADERS = import.meta.glob<string>('/content/reports/*/*.{md,mdx}', { query: '?raw', import: 'default' });

/**
 * The file a report's document in a language is committed to: the file it is published in, or a new MDX file for a
 * report not yet published. A Markdown file stays Markdown.
 */
export function reportFileOf(slug: string, locale: Locale): string {
  return REPORTS.find(report => report.slug === slug && report.locale === locale)?.path ?? `/content/reports/${slug}/${locale}.mdx`;
}

/** The published text of a report's document in a language. */
export function reportSourceOf(slug: string, locale: Locale): Promise<string> {
  return REPORT_SOURCE_LOADERS[reportOf(slug, locale).path]();
}

export function benchmarkDocumentPath(benchmarkId: string, locale: Locale): string {
  const path = `/content/benchmarks/${benchmarkId}/${locale}.mdx`;
  if (!(path in DOCUMENTS)) {
    throw new Error(`no page document for ${benchmarkId} in ${locale}`);
  }
  return path;
}

/** A document's sections: its second-level headings with their anchors. */
export function documentSections(path: string): PageSection[] {
  return DOCUMENT_HEADINGS[path].flatMap(entry => (entry.depth === 2 && entry.id ? [{ id: entry.id, label: entry.value }] : []));
}
