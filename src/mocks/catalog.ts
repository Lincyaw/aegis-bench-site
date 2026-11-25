import type { Half, HarnessRef, Locale, ModelRef, StageRef, VendorSlot } from '../api/types';

/** A display string in each of the site's languages. */
export type Text = Record<Locale, string>;

/** Evaluation records (task texts, trajectories, check titles, reviews) are kept in the language they were made in. */
export const RECORD_LOCALE: Locale = 'zh-CN';

/** Every combination runs each task this many times. */
export const RUNS_PER_TASK = 5;

/** The month of the current evaluation round, and the day its results and reviews were published. */
export const EVALUATED_IN = '2026-11';
export const PUBLISHED_ON = '2026-11-20';

export const STAGES: { id: string; half: Half; position: number; name: Text; summary: Text }[] = [
  {
    id: '01', half: 'dev', position: 1, name: { 'zh-CN': '需求分析', en: 'Requirements' },
    summary: { 'zh-CN': '理解业务需求，澄清歧义，并将其拆解为可验收的任务。', en: 'Understand the business need, resolve its ambiguities and break it into tasks that can be accepted.' },
  },
  {
    id: '02', half: 'dev', position: 2, name: { 'zh-CN': '架构设计', en: 'Architecture' },
    summary: { 'zh-CN': '在既有约束下提出技术方案，权衡取舍并形成设计决策。', en: 'Propose a technical approach within the existing constraints, weigh the trade-offs and reach design decisions.' },
  },
  {
    id: '03', half: 'dev', position: 3, name: { 'zh-CN': '编码实现', en: 'Implementation' },
    summary: { 'zh-CN': '在既有代码库中实现功能、修复缺陷，并与现有代码保持一致。', en: 'Implement features and fix defects in an existing codebase, consistent with the code around them.' },
  },
  {
    id: '04', half: 'dev', position: 4, name: { 'zh-CN': '代码评审', en: 'Code review' },
    summary: { 'zh-CN': '审查代码变更，识别缺陷与风险，并提出可执行的修改意见。', en: 'Review code changes, identify defects and risks, and give feedback that can be acted on.' },
  },
  {
    id: '05', half: 'ops', position: 5, name: { 'zh-CN': '测试验证', en: 'Testing' },
    summary: { 'zh-CN': '设计并执行测试，定位失败原因，判断变更能否交付。', en: 'Design and run tests, locate the causes of failures and judge whether a change can be delivered.' },
  },
  {
    id: '06', half: 'ops', position: 6, name: { 'zh-CN': '构建发布', en: 'Release' },
    summary: { 'zh-CN': '完成构建与发布，管理变更，并在异常时安全回滚。', en: 'Build and release, manage changes, and roll back safely when something goes wrong.' },
  },
  {
    id: '07', half: 'ops', position: 7, name: { 'zh-CN': '运维保障', en: 'Operations' },
    summary: { 'zh-CN': '响应告警，诊断线上故障，恢复服务并说明根因。', en: 'Respond to alerts, diagnose production failures, restore service and explain the root cause.' },
  },
  {
    id: '08', half: 'ops', position: 8, name: { 'zh-CN': '维护演进', en: 'Maintenance' },
    summary: { 'zh-CN': '重构代码、迁移系统与升级依赖，保证系统的长期可维护性。', en: 'Refactor code, migrate systems and upgrade dependencies so that the system stays maintainable.' },
  },
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

/** The staff who author tasks and review runs, by account. */
export const STAFF = ['lin.fang', 'zhou.yu', 'chen.qi'];

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
