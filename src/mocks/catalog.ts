import { combinationKey } from '../api/constraints';
import type { CombinationScope, EntrantKey, HarnessRef, Locale, ModelRef, StageRef } from '../api/types';
import { openedIndexes } from './records';

export function stageRef(stageId: string, locale: Locale): StageRef {
  const stage = openedIndexes().catalog.stages.find(candidate => candidate.id === stageId);
  if (!stage) {
    throw new Error(`unknown stage ${stageId}`);
  }
  return { id: stage.id, half: stage.half, position: stage.position, name: stage.name[locale] };
}

export function modelRecordOf(modelId: string) {
  const model = openedIndexes().catalog.models.find(candidate => candidate.id === modelId);
  if (!model) {
    throw new Error(`unknown model ${modelId}`);
  }
  return model;
}

export function modelRef(modelId: string, locale: Locale): ModelRef {
  const model = modelRecordOf(modelId);
  return { id: model.id, slot: model.slot, name: model.name[locale], vendor: model.vendor[locale] };
}

/** Whether two entrants name the same model and harness pair. */
export function isSameCombination(a: EntrantKey, b: EntrantKey): boolean {
  return combinationKey(a.modelId, a.harnessId) === combinationKey(b.modelId, b.harnessId);
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
