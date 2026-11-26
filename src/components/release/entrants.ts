import type { Combination, EntrantKey } from '../../api/types';

/** Whether a release's entrant names this combination of the benchmark. */
export function isEntrant(key: EntrantKey, entrant: Combination): boolean {
  return key.modelId === entrant.model.id && key.harnessId === entrant.harness.id;
}
