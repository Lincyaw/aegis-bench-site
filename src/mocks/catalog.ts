import type { HarnessRef, ModelRef, StageRef } from '../api/client';

/** Every combination runs each task this many times. */
export const RUNS_PER_TASK = 5;

/** The month of the current evaluation round, and the day its results and reviews were published. */
export const EVALUATED_IN = '2026-11';
export const PUBLISHED_ON = '2026-11-20';

export const STAGES: StageRef[] = [
  { id: '01', name: '需求分析', half: 'dev', position: 1 },
  { id: '02', name: '架构设计', half: 'dev', position: 2 },
  { id: '03', name: '编码实现', half: 'dev', position: 3 },
  { id: '04', name: '代码评审', half: 'dev', position: 4 },
  { id: '05', name: '测试验证', half: 'ops', position: 5 },
  { id: '06', name: '构建发布', half: 'ops', position: 6 },
  { id: '07', name: '运维保障', half: 'ops', position: 7 },
  { id: '08', name: '维护演进', half: 'ops', position: 8 },
];

export const MODELS: ModelRef[] = [
  { id: 'jia', name: '模型甲', vendor: '厂商 A', slot: 'A' },
  { id: 'yi', name: '模型乙', vendor: '厂商 B', slot: 'B' },
  { id: 'bing', name: '模型丙', vendor: '厂商 C', slot: 'C' },
  { id: 'ding', name: '模型丁', vendor: '厂商 D', slot: 'D' },
  { id: 'wu', name: '模型戊', vendor: '厂商 D', slot: 'D' },
  { id: 'ji', name: '模型己', vendor: '厂商 A', slot: 'A' },
  { id: 'geng', name: '模型庚', vendor: '厂商 B', slot: 'B' },
];

export const HARNESSES: HarnessRef[] = [
  { id: 'x', name: '框架 X' },
  { id: 'y', name: '框架 Y' },
  { id: 'z', name: '框架 Z' },
];

export function stageRef(stageId: string): StageRef {
  const stage = STAGES.find(candidate => candidate.id === stageId);
  if (!stage) {
    throw new Error(`unknown stage ${stageId}`);
  }
  return stage;
}

export function modelById(modelId: string): ModelRef {
  const model = MODELS.find(candidate => candidate.id === modelId);
  if (!model) {
    throw new Error(`unknown model ${modelId}`);
  }
  return model;
}

export function harnessById(harnessId: string): HarnessRef {
  const harness = HARNESSES.find(candidate => candidate.id === harnessId);
  if (!harness) {
    throw new Error(`unknown harness ${harnessId}`);
  }
  return harness;
}
