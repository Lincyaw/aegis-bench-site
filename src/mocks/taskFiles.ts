import type { TaskEntry, TaskFile, WithheldReason } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { readTaskFile, type TaskFileEntry } from './records';

/*
 * Each task's Harbor directory. The reference solution and the reference answers are part of it: the public site
 * withholds them, the console shows them whole.
 */

/** Entries per page of a directory when a request names no limit, as the spec declares. */
export const DEFAULT_ENTRY_PAGE_SIZE = 50;

/** No response carries more of a file's text than this, as the spec declares. */
export const MAX_FILE_TEXT_BYTES = 256 * 1024;

const MEDIA_TYPES: Record<string, string> = {
  md: 'text/markdown', toml: 'application/toml', sh: 'application/x-sh', py: 'text/x-python', yaml: 'application/yaml',
  json: 'application/json', txt: 'text/plain', patch: 'text/x-diff',
};

export function mediaTypeOf(path: string): string {
  const name = path.split('/').at(-1) ?? path;
  if (name === 'Dockerfile') {
    return 'text/plain';
  }
  const mediaType = MEDIA_TYPES[name.split('.').at(-1) ?? ''];
  if (!mediaType) {
    throw new Error(`no media type for ${path}`);
  }
  return mediaType;
}

/** Why everything under a directory is withheld, when every file there is withheld for the same reason. */
export function withheldUnder(files: TaskFileEntry[], directory: string): WithheldReason | undefined {
  const reasons = new Set(files.filter(file => file.path.startsWith(`${directory}/`)).map(file => file.withheld));
  const [reason] = reasons;
  return reasons.size === 1 ? reason : undefined;
}

/** A directory's entries, directories first and each group by name, or nothing when the task has no such directory. */
export function directoryEntriesOf(files: TaskFileEntry[], directory: string): TaskEntry[] | undefined {
  const prefix = directory === '' ? '' : `${directory}/`;
  const inside = files.filter(file => file.path.startsWith(prefix));
  if (inside.length === 0) {
    return undefined;
  }
  const entries = new Map<string, TaskEntry>();
  for (const file of inside) {
    const [name, ...rest] = file.path.slice(prefix.length).split('/');
    const path = `${prefix}${name}`;
    entries.set(path, rest.length > 0
      ? { path, kind: 'directory', withheld: withheldUnder(files, path) }
      : file.withheld ? { path, kind: 'file', withheld: file.withheld } : { path, kind: 'file', size: file.size });
  }
  return [...entries.values()].sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === 'directory' ? -1 : 1));
}

/** A task's file as the API serves it, its text cut where it passes the limit. */
export async function taskFileOf(benchmarkId: string, taskId: string, file: TaskFileEntry): Promise<TaskFile> {
  const text = await readTaskFile(benchmarkOf(benchmarkId).record, taskId, file);
  const bytes = new TextEncoder().encode(text);
  const truncated = bytes.length > MAX_FILE_TEXT_BYTES;
  return {
    path: file.path, size: bytes.length, mediaType: mediaTypeOf(file.path),
    text: truncated ? new TextDecoder().decode(bytes.slice(0, MAX_FILE_TEXT_BYTES)) : text, truncated,
  };
}
