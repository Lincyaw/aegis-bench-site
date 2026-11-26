import type { ModelTaskQuery } from '../api/consoleClient';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { TaskOrder, TaskSpread } from '../api/types';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { TASK_ORDER_DEFAULT } from '../tasks/consoleTaskQuery';

/** Tasks per page of a model's task list. */
export const MODEL_TASK_PAGE_SIZE = 20;

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseModelTaskQuery(params: URLSearchParams): ModelTaskQuery {
  const spread = params.get('spread') ?? undefined;
  const order = params.get('order') ?? TASK_ORDER_DEFAULT;
  const offset = Number(params.get('offset') ?? 0);
  if (spread !== undefined && !consoleTaskSpreadValues.includes(spread as TaskSpread)) {
    throw new Error(`no task spread ${spread}`);
  }
  if (!consoleTaskOrderValues.includes(order as TaskOrder)) {
    throw new Error(`no task order ${order}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % MODEL_TASK_PAGE_SIZE !== 0) {
    throw new Error(`no page of tasks starts at ${params.get('offset')}`);
  }
  return { harness: params.get('harness') ?? '', tag: params.get('tag') ?? '', q: params.get('q') ?? '', spread: spread as TaskSpread | undefined, order: order as TaskOrder, offset };
}

/** The list's address parameters, leaving out what equals the default. */
export function modelTaskSearch(query: Partial<ModelTaskQuery>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query) as [string, string | number | undefined][]) {
    if (value !== undefined && value !== '' && value !== 0 && !(name === 'order' && value === TASK_ORDER_DEFAULT)) {
      params.set(name, String(value));
    }
  }
  return params;
}

export function consoleModelsPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/models`;
}

/** A model's page, narrowed to one harness or one collection, or filtered as the query says. */
export function consoleModelPath(benchmarkId: string, modelId: string, query: Partial<ModelTaskQuery> = {}): string {
  const search = modelTaskSearch(query).toString();
  return `${consoleModelsPath(benchmarkId)}/${modelId}${search ? `?${search}` : ''}`;
}
