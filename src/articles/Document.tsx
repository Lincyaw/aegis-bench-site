import type { MDXComponents, MDXContent } from 'mdx/types';
import { About, Callout, Citation, DocumentLink, Fact, Facts, Faq, Flow, Question, Sample, Step, Version, Versions } from './blocks';
import { DOCUMENTS } from './library';
import styles from './blocks.module.css';

/**
 * An editorial document of the site rendered with the site's blocks. A page adds the blocks that need its data, such as
 * a benchmark's leaderboard, through `blocks`.
 */
export function Document({ path, blocks }: { path: string; blocks?: MDXComponents }) {
  return <DocumentBody Content={DOCUMENTS[path]} blocks={blocks} />;
}

/** Any compiled document with the site's blocks, such as a draft being previewed, set as the site sets its documents. */
export function DocumentBody({ Content, blocks }: { Content: MDXContent; blocks?: MDXComponents }) {
  return (
    <article className={styles.document}>
      <Content components={{ a: DocumentLink, About, Callout, Citation, Fact, Facts, Faq, Flow, Question, Sample, Step, Version, Versions, ...blocks }} />
    </article>
  );
}
