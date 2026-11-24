import type { Half, HarnessRef, ModelRef, StageRef, VendorSlot } from '../api/client';
import type { Locale } from '../i18n/locales';

/** A display string in each of the site's languages. */
export type Text = Record<Locale, string>;

/** Evaluation records (task texts, trajectories, check titles, reviews) are kept in the language they were made in. */
export const RECORD_LOCALE: Locale = 'zh-CN';

/** Every combination runs each task this many times. */
export const RUNS_PER_TASK = 5;

/** The month of the current evaluation round, and the day its results and reviews were published. */
export const EVALUATED_IN = '2026-11';
export const PUBLISHED_ON = '2026-11-20';

export const STAGES: { id: string; half: Half; position: number; name: Text }[] = [
  { id: '01', half: 'dev', position: 1, name: { 'zh-CN': '需求分析', en: 'Requirements' } },
  { id: '02', half: 'dev', position: 2, name: { 'zh-CN': '架构设计', en: 'Architecture' } },
  { id: '03', half: 'dev', position: 3, name: { 'zh-CN': '编码实现', en: 'Implementation' } },
  { id: '04', half: 'dev', position: 4, name: { 'zh-CN': '代码评审', en: 'Code review' } },
  { id: '05', half: 'ops', position: 5, name: { 'zh-CN': '测试验证', en: 'Testing' } },
  { id: '06', half: 'ops', position: 6, name: { 'zh-CN': '构建发布', en: 'Release' } },
  { id: '07', half: 'ops', position: 7, name: { 'zh-CN': '运维保障', en: 'Operations' } },
  { id: '08', half: 'ops', position: 8, name: { 'zh-CN': '维护演进', en: 'Maintenance' } },
];

export const MODELS: { id: string; slot: VendorSlot; name: Text; vendor: Text }[] = [
  { id: 'jia', slot: 'A', name: { 'zh-CN': '模型甲', en: 'Model Alpha' }, vendor: { 'zh-CN': '厂商 A', en: 'Vendor A' } },
  { id: 'yi', slot: 'B', name: { 'zh-CN': '模型乙', en: 'Model Beta' }, vendor: { 'zh-CN': '厂商 B', en: 'Vendor B' } },
  { id: 'bing', slot: 'C', name: { 'zh-CN': '模型丙', en: 'Model Gamma' }, vendor: { 'zh-CN': '厂商 C', en: 'Vendor C' } },
  { id: 'ding', slot: 'D', name: { 'zh-CN': '模型丁', en: 'Model Delta' }, vendor: { 'zh-CN': '厂商 D', en: 'Vendor D' } },
  { id: 'wu', slot: 'D', name: { 'zh-CN': '模型戊', en: 'Model Epsilon' }, vendor: { 'zh-CN': '厂商 D', en: 'Vendor D' } },
  { id: 'ji', slot: 'A', name: { 'zh-CN': '模型己', en: 'Model Zeta' }, vendor: { 'zh-CN': '厂商 A', en: 'Vendor A' } },
  { id: 'geng', slot: 'B', name: { 'zh-CN': '模型庚', en: 'Model Eta' }, vendor: { 'zh-CN': '厂商 B', en: 'Vendor B' } },
];

export const HARNESSES: { id: string; name: Text }[] = [
  { id: 'x', name: { 'zh-CN': '框架 X', en: 'Harness X' } },
  { id: 'y', name: { 'zh-CN': '框架 Y', en: 'Harness Y' } },
  { id: 'z', name: { 'zh-CN': '框架 Z', en: 'Harness Z' } },
];

export function stageRef(stageId: string, locale: Locale): StageRef {
  const stage = STAGES.find(candidate => candidate.id === stageId);
  if (!stage) {
    throw new Error(`unknown stage ${stageId}`);
  }
  return { id: stage.id, half: stage.half, position: stage.position, name: stage.name[locale] };
}

export function modelRef(modelId: string, locale: Locale): ModelRef {
  const model = MODELS.find(candidate => candidate.id === modelId);
  if (!model) {
    throw new Error(`unknown model ${modelId}`);
  }
  return { id: model.id, slot: model.slot, name: model.name[locale], vendor: model.vendor[locale] };
}

export function harnessRef(harnessId: string, locale: Locale): HarnessRef {
  const harness = HARNESSES.find(candidate => candidate.id === harnessId);
  if (!harness) {
    throw new Error(`unknown harness ${harnessId}`);
  }
  return { id: harness.id, name: harness.name[locale] };
}
