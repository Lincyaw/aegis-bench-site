import type { HarnessRef, Locale, ModelRef, StageRef } from '../api/types';
import { openedIndexes } from './records';

/** Evaluation records (task texts, trajectories, check titles, reviews) are kept in the language they were made in. */
export const RECORD_LOCALE: Locale = 'zh-CN';

export function stageRef(stageId: string, locale: Locale): StageRef {
  const stage = openedIndexes().catalog.stages.find(candidate => candidate.id === stageId);
  if (!stage) {
    throw new Error(`unknown stage ${stageId}`);
  }
  return { id: stage.id, half: stage.half, position: stage.position, name: stage.name[locale] };
}

export function modelRef(modelId: string, locale: Locale): ModelRef {
  const model = openedIndexes().catalog.models.find(candidate => candidate.id === modelId);
  if (!model) {
    throw new Error(`unknown model ${modelId}`);
  }
  return { id: model.id, slot: model.slot, name: model.name[locale], vendor: model.vendor[locale] };
}

/** The key the API names a model and harness pair by, "<model id>-<harness id>", as the spec declares it. */
export function combinationKey(modelId: string, harnessId: string): string {
  return `${modelId}-${harnessId}`;
}

/** The combinations a request keeps to: a model's, those in a harness, or both; every combination when both are empty. */
export interface CombinationScope {
  model: string;
  harness: string;
}

/** Whether a scope keeps to a model and harness pair. */
export function keepsTo(scope: CombinationScope, modelId: string, harnessId: string): boolean {
  return (!scope.model || modelId === scope.model) && (!scope.harness || harnessId === scope.harness);
}

export function harnessRef(harnessId: string, locale: Locale): HarnessRef {
  const harness = openedIndexes().catalog.harnesses.find(candidate => candidate.id === harnessId);
  if (!harness) {
    throw new Error(`unknown harness ${harnessId}`);
  }
  return { id: harness.id, name: harness.name[locale] };
}
