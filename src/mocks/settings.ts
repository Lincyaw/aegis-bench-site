import type { Settings, SettingsChange } from '../api/types';
import { openedIndexes } from './records';

/** The settings of settings.json as changed since the server opened the data directory; a reload brings the file's back. */
let settings: Settings | undefined;

export function currentSettings(): Settings {
  settings ??= structuredClone(openedIndexes().settings);
  return settings;
}

export function updateSettings(change: SettingsChange, account: string): Settings {
  settings = { ...change, updatedBy: account, updatedAt: new Date().toISOString() };
  return settings;
}
