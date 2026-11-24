import mdx from '@mdx-js/rollup';
import rehypeExtractToc from '@stefanprobst/rehype-extract-toc';
import rehypeExportToc from '@stefanprobst/rehype-extract-toc/mdx';
import react from '@vitejs/plugin-react';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { defineConfig } from 'vite';

// Editorial documents under content/ compile to React components: .mdx with the site's blocks, .md as plain Markdown.
// Each also exports its frontmatter and its headings with their anchors, as `tableOfContents`.
export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
        rehypePlugins: [rehypeSlug, rehypeExtractToc, rehypeExportToc],
      }),
    },
    react({ include: /\.(mdx|md|tsx|ts|jsx|js)$/ }),
  ],
});
