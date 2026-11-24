import { BENCHMARKS_PATH } from '../site/siteMap';

/** Entries a directory shows at first and adds each time the reader asks for more. */
export const ENTRY_PAGE_SIZE = 50;

/** The file a task's page opens on: the task text the model receives. */
export const INSTRUCTION_PATH = 'instruction.md';

/** The search parameter that names the open file. */
export const FILE_PARAM = 'path';

/** A task's files, opened on one file when given. */
export function taskFilesPath(benchmarkId: string, taskId: string, file?: string): string {
  const path = `${BENCHMARKS_PATH}/${benchmarkId}/tasks/${taskId}`;
  return file ? `${path}?${new URLSearchParams({ [FILE_PARAM]: file }).toString()}` : path;
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
