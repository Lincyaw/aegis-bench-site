import type { InfiniteData, UseSuspenseInfiniteQueryResult } from '@tanstack/react-query';
import type { TaskEntryKind } from '../../api/types';

/** An entry as the tree draws it; a mark says what sets the entry apart, and a closed entry cannot be opened. */
export interface BrowsedEntry {
  path: string;
  kind: TaskEntryKind;
  size?: number;
  mark?: { label: string; closed: boolean };
}

/** One directory's entries loaded so far, and how to load the rest. */
export interface DirectoryPages {
  entries: BrowsedEntry[];
  total: number;
  loadingMore: boolean;
  loadMore: () => void;
}

/** A directory's pages of entries as the tree draws them, each marked as the site marks what it withholds; a page that failed to load fails the view. */
export function directoryPagesOf<Entry extends { path: string; kind: TaskEntryKind; size?: number }>(
  pages: UseSuspenseInfiniteQueryResult<InfiniteData<{ items: Entry[]; total: number }>>, markOf: (entry: Entry) => BrowsedEntry['mark'],
): DirectoryPages {
  if (pages.isFetchNextPageError) {
    throw pages.error;
  }
  return {
    entries: pages.data.pages.flatMap(page => page.items).map(entry => ({ path: entry.path, kind: entry.kind, size: entry.size, mark: markOf(entry) })),
    total: pages.data.pages[0].total, loadingMore: pages.isFetchingNextPage, loadMore: () => void pages.fetchNextPage(),
  };
}

/** The directories that hold a path, outermost first: "tests/hidden/a.py" lies in "tests" and "tests/hidden". */
export function directoriesHolding(path: string): string[] {
  const parts = path.split('/').slice(0, -1);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

export function nameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
