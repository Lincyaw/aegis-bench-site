/**
 * FNV-1a followed by the MurmurHash3 finaliser: every generated value depends only on its key, so the demo is the
 * same on every load, and keys that differ in one character still land far apart.
 */
export function hashOf(key: string): number {
  let hash = 0x811c9dc5;
  for (const char of key) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** A value in [0, 1) drawn from the key. */
export function fractionOf(key: string): number {
  return hashOf(key) / 0x100000000;
}

/** One of the items, drawn from the key. */
export function pickOf<T>(items: readonly T[], key: string): T {
  return items[hashOf(key) % items.length];
}
