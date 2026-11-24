import type { MDXComponents } from 'mdx/types';
import { Callout, Citation, DocumentLink, Fact, Facts, Faq, Flow, Question, Sample, Step, Version, Versions } from './blocks';
import { DOCUMENTS } from './library';
import styles from './blocks.module.css';

/**
 * An editorial document rendered with the site's blocks. A page adds the blocks that need its data, such as a
 * benchmark's leaderboard, through `blocks`.
 */
export function Document({ path, blocks }: { path: string; blocks?: MDXComponents }) {
  const Content = DOCUMENTS[path];
  return (
    <article className={styles.document}>
      <Content components={{ a: DocumentLink, Callout, Citation, Fact, Facts, Faq, Flow, Question, Sample, Step, Version, Versions, ...blocks }} />
    </article>
  );
}
