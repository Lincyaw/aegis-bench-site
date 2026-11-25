import { evaluate } from '@mdx-js/mdx';
import type { MDXContent } from 'mdx/types';
import * as runtime from 'react/jsx-runtime';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

/** A document compiled in the browser: its body, and its frontmatter as written. */
export interface EvaluatedDocument {
  Content: MDXContent;
  frontmatter: unknown;
}

/**
 * Compiles and runs a document in the browser with the plugins vite.config.ts gives the build, so a draft previews as
 * its committed file will render; a Markdown file stays Markdown.
 */
export async function evaluateDocument(source: string, format: 'md' | 'mdx'): Promise<EvaluatedDocument> {
  const document = await evaluate(source, { ...runtime, format, remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter], rehypePlugins: [rehypeSlug] });
  return { Content: document.default, frontmatter: document.frontmatter };
}
