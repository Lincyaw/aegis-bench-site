import { clsx } from 'clsx';
import { Suspense, useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskFile } from '../../api/types';
import { Loading, Tag } from '../../ui/content';
import content from '../../ui/content.module.css';
import { ChevronIcon, MoreButton } from '../../ui/controls';
import { InfoHint } from '../../ui/hint';
import { HuggingFaceBoundary, HuggingFaceLink } from '../run/HuggingFace';
import { directoriesHolding, formatSize, nameOf, type BrowsedEntry, type DirectoryPages } from './files';
import styles from './TaskFileBrowser.module.css';

/** Where the browser reads a task's directory from: the public site's or the console's API, each with its own hooks. */
export interface TaskFileSource {
  useDirectory: (directory: string) => DirectoryPages;
  useFile: (path: string) => TaskFile;
}

/** What the tree needs to draw an entry and to report a choice. */
interface Tree {
  source: TaskFileSource;
  open: string;
  expanded: ReadonlySet<string>;
  onToggle: (directory: string) => void;
  onOpen: (file: string) => void;
}

/**
 * A task's Harbor directory: its tree on one side, the open file on the other. The directories that hold the open file
 * start expanded; `className` sizes the browser for the page it sits in, and `about` explains the directory beneath
 * its tree. A task whose files are kept on Hugging Face links its directory there.
 */
export function TaskFileBrowser({ source, open, onOpen, about, huggingFaceUrl, className }: {
  source: TaskFileSource; open: string; onOpen: (file: string) => void; about: string; huggingFaceUrl?: string; className?: string;
}) {
  const { t } = useTranslation();
  // The open file stays in view until the next one arrives.
  const shown = useDeferredValue(open);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(directoriesHolding(open)));
  const tree: Tree = {
    source, open, expanded, onOpen,
    onToggle: directory => setExpanded(current => {
      const next = new Set(current);
      if (!next.delete(directory)) {
        next.add(directory);
      }
      return next;
    }),
  };
  return (
    <div className={clsx(styles.browser, className)}>
      <nav className={styles.tree} aria-label={t('tasks.tree')}>
        <div className={styles.scroll}>
          <Suspense fallback={<Loading />}>
            <DirectoryEntries tree={tree} directory="" />
          </Suspense>
        </div>
        <div className={styles.about}>
          <p className={styles.format}>
            <span className="t-micro c-faint">{t('tasks.format')}</span>
            <InfoHint label={t('ui.about', { subject: t('tasks.format') })}>{about}</InfoHint>
          </p>
          {huggingFaceUrl && <HuggingFaceLink about={t('tasks.huggingFace')} url={huggingFaceUrl} />}
        </div>
      </nav>
      <section className={styles.viewer} aria-label={t('tasks.file')}>
        <HuggingFaceBoundary resetKey={shown}>
          <Suspense fallback={<Loading />}>
            <FileView source={source} path={shown} />
          </Suspense>
        </HuggingFaceBoundary>
      </section>
    </div>
  );
}

/** A directory's entries a page at a time, with the directories the reader opened drawn beneath them. */
export function DirectoryEntries({ tree, directory }: { tree: Tree; directory: string }) {
  const { t } = useTranslation();
  const { entries, total, loadingMore, loadMore } = tree.source.useDirectory(directory);
  return (
    <ul className={styles.entries}>
      {entries.map(entry => (
        <li key={entry.path}>
          <EntryRow tree={tree} entry={entry} />
          {entry.kind === 'directory' && !entry.mark?.closed && tree.expanded.has(entry.path) && (
            <Suspense fallback={<Loading />}>
              <DirectoryEntries tree={tree} directory={entry.path} />
            </Suspense>
          )}
        </li>
      ))}
      {entries.length < total && (
        <li><MoreButton className={styles.more} label={t('tasks.loadMore', { shown: entries.length, total })} loading={loadingMore} onClick={loadMore} /></li>
      )}
    </ul>
  );
}

/** An entry's row: a directory opens and closes, a file opens in the viewer, a closed entry only says why. */
export function EntryRow({ tree, entry }: { tree: Tree; entry: BrowsedEntry }) {
  const directory = entry.kind === 'directory';
  const closed = entry.mark?.closed ?? false;
  const expanded = directory && tree.expanded.has(entry.path);
  return (
    <button
      type="button"
      className={clsx(styles.entry, directory && styles.directory)}
      disabled={closed}
      aria-expanded={directory && !closed ? expanded : undefined}
      aria-current={entry.path === tree.open ? 'true' : undefined}
      onClick={() => (directory ? tree.onToggle(entry.path) : tree.onOpen(entry.path))}
    >
      <span className={styles.chevron}>{directory && !closed && <ChevronIcon />}</span>
      <span className={clsx(styles.name, 't-small')}>{nameOf(entry.path)}{directory && '/'}</span>
      <span className={styles.aside}>
        {entry.mark && <Tag dashed>{entry.mark.label}</Tag>}
        {entry.size !== undefined && <span className="t-micro c-faint">{formatSize(entry.size)}</span>}
      </span>
    </button>
  );
}

/** A file's text as it is, with its size and type; a long file shows its start. */
export function FileView({ source, path }: { source: TaskFileSource; path: string }) {
  const { t } = useTranslation();
  const file = source.useFile(path);
  return (
    <div className={styles.file}>
      <header className={styles.fileHead}>
        <span className="t-mono">{file.path}</span>
        <span className="t-micro c-faint">{formatSize(file.size)} · {file.mediaType}</span>
      </header>
      {file.truncated && <p className="t-micro c-faint">{t('tasks.truncated')}</p>}
      {file.text === undefined ? <p className="t-small c-faint">{t('tasks.binary')}</p> : <pre className={clsx(content.panel, styles.text)}>{file.text}</pre>}
    </div>
  );
}
