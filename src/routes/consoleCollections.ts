import { consoleTaskOrderValues } from '../api/schema';
import type { TaskOrder } from '../api/types';
import { consoleBenchmarkPath } from './console';
import { TASK_ORDER_DEFAULT } from './consoleTasks';

/** Tasks per page of a collection's matrix. */
export const MATRIX_PAGE_SIZE = 20;

/** The views of a collection, in the order its tabs show them. */
export const COLLECTION_TABS = ['matrix', 'models', 'analysis'] as const;
export type CollectionTab = (typeof COLLECTION_TABS)[number];

/** The charts of a collection's analysis, in the order its switch shows them. */
export const COLLECTION_CHARTS = ['ranking', 'cost', 'failures'] as const;
export type CollectionChart = (typeof COLLECTION_CHARTS)[number];

export interface CollectionView {
  tab: CollectionTab;
  chart: CollectionChart;
  order: TaskOrder;
  offset: number;
}

/** The view an address names; a value outside its set fails the page rather than showing nothing. */
export function parseCollectionView(params: URLSearchParams): CollectionView {
  const tab = params.get('tab') ?? 'matrix';
  const chart = params.get('chart') ?? 'ranking';
  const order = params.get('order') ?? TASK_ORDER_DEFAULT;
  const offset = Number(params.get('offset') ?? 0);
  if (!COLLECTION_TABS.includes(tab as CollectionTab)) {
    throw new Error(`a collection has no tab ${tab}`);
  }
  if (!COLLECTION_CHARTS.includes(chart as CollectionChart)) {
    throw new Error(`a collection has no chart ${chart}`);
  }
  if (!consoleTaskOrderValues.includes(order as TaskOrder)) {
    throw new Error(`no task order ${order}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % MATRIX_PAGE_SIZE !== 0) {
    throw new Error(`no page of tasks starts at ${params.get('offset')}`);
  }
  return { tab: tab as CollectionTab, chart: chart as CollectionChart, order: order as TaskOrder, offset };
}

/** A view's address parameters, leaving out the defaults. */
export function collectionSearch(view: Partial<CollectionView>): URLSearchParams {
  const params = new URLSearchParams();
  if (view.tab && view.tab !== 'matrix') {
    params.set('tab', view.tab);
  }
  if (view.chart && view.chart !== 'ranking') {
    params.set('chart', view.chart);
  }
  if (view.order && view.order !== TASK_ORDER_DEFAULT) {
    params.set('order', view.order);
  }
  if (view.offset) {
    params.set('offset', String(view.offset));
  }
  return params;
}

export function collectionsPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/collections`;
}

export function collectionPath(benchmarkId: string, tag: string, view: Partial<CollectionView> = {}): string {
  const search = collectionSearch(view).toString();
  return `${collectionsPath(benchmarkId)}/${encodeURIComponent(tag)}${search ? `?${search}` : ''}`;
}
