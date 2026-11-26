import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { ModelTaskQuery, TaskOrder, TaskSpread } from '../api/types';
import { pathWithSearch, searchOf, type AddressTable } from './address';
import { consoleBenchmarkPath } from './console';
import { TASK_ORDER_DEFAULT } from './consoleTasks';

/** Tasks per page of a model's task list. */
export const MODEL_TASK_PAGE_SIZE = 20;

/** Every parameter a model's page keeps in its address, with the value the address leaves unsaid. */
export const MODEL_TASK_PARAMS: AddressTable<ModelTaskQuery> = {
  harness: undefined, tag: undefined, task: undefined, q: '', spread: undefined, order: TASK_ORDER_DEFAULT, offset: 0,
};

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseModelTaskQuery(params: URLSearchParams): ModelTaskQuery {
  const spread = params.get('spread') ?? undefined;
  const order = params.get('order') ?? MODEL_TASK_PARAMS.order;
  const offset = Number(params.get('offset') ?? MODEL_TASK_PARAMS.offset);
  if (spread !== undefined && !consoleTaskSpreadValues.includes(spread as TaskSpread)) {
    throw new Error(`no task spread ${spread}`);
  }
  if (!consoleTaskOrderValues.includes(order as TaskOrder)) {
    throw new Error(`no task order ${order}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % MODEL_TASK_PAGE_SIZE !== 0) {
    throw new Error(`no page of tasks starts at ${params.get('offset')}`);
  }
  return {
    harness: params.get('harness') ?? undefined, tag: params.get('tag') ?? undefined, task: params.get('task') ?? undefined, q: params.get('q') ?? MODEL_TASK_PARAMS.q,
    spread: spread as TaskSpread | undefined, order: order as TaskOrder, offset,
  };
}

export function consoleModelsPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/models`;
}

/** A model's page, narrowed to one harness, one collection or one task, or filtered as the query says. */
export function consoleModelPath(benchmarkId: string, modelId: string, query: Partial<ModelTaskQuery> = {}): string {
  return pathWithSearch(`${consoleModelsPath(benchmarkId)}/${modelId}`, searchOf(MODEL_TASK_PARAMS, query));
}
