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
const documents = mdx({
  remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter],
  rehypePlugins: [rehypeSlug, rehypeExtractToc, rehypeExportToc],
});
const compileDocument = documents.transform;
if (typeof compileDocument !== 'function') {
  throw new Error('@mdx-js/rollup compiles in a transform function');
}

export default defineConfig({
  plugins: [
    {
      ...documents,
      enforce: 'pre',
      // @mdx-js/rollup drops an id's query before its filter, so it would also compile a document imported ?raw for its text.
      transform(value, id) {
        return id.endsWith('?raw') ? null : compileDocument.call(this, value, id);
      },
    },
    react({ include: /\.(mdx|md|tsx|ts|jsx|js)$/ }),
  ],
});
