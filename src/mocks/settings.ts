import type { Settings, SettingsChange } from '../api/types';

/** The settings the demo starts with; changes live in memory, so a reload brings these back. */
const INITIAL_SETTINGS: Settings = {
  workspace: { name: '评测工作区', contactEmail: 'contact@example.org' },
  publication: {
    reportReviewers: 2,
    reportChecks: ['正文中的数字都能从运行复算', '引用的运行都在当前发布的版本里', '对外页面在桌面和手机上都预览过'],
  },
  updatedBy: 'lin.fang',
  updatedAt: '2026-11-01T09:00:00Z',
};

let settings: Settings = structuredClone(INITIAL_SETTINGS);

export function currentSettings(): Settings {
  return settings;
}

export function updateSettings(change: SettingsChange, account: string): Settings {
  settings = { ...change, updatedBy: account, updatedAt: new Date().toISOString() };
  return settings;
}
