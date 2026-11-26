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
