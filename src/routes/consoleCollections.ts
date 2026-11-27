import { consoleTaskOrderValues } from '../api/schema';
import type { TaskOrder } from '../api/types';
import { parseChoice, parseOffset, pathWithSearch, searchOf, type AddressTable } from './address';
import { benchmarkSectionPath } from './console';
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

/** Every parameter a collection's page keeps in its address, with the value the address leaves unsaid. */
export const COLLECTION_PARAMS: AddressTable<CollectionView> = { tab: 'matrix', chart: 'ranking', order: TASK_ORDER_DEFAULT, offset: 0 };

/** The view an address names; a value outside its set fails the page rather than showing nothing. */
export function parseCollectionView(params: URLSearchParams): CollectionView {
  return {
    tab: parseChoice(params, 'tab', COLLECTION_TABS) ?? COLLECTION_PARAMS.tab, chart: parseChoice(params, 'chart', COLLECTION_CHARTS) ?? COLLECTION_PARAMS.chart,
    order: parseChoice(params, 'order', consoleTaskOrderValues) ?? COLLECTION_PARAMS.order, offset: parseOffset(params, MATRIX_PAGE_SIZE),
  };
}

export function collectionsPath(benchmarkId: string): string {
  return benchmarkSectionPath(benchmarkId, 'collections');
}

export function collectionPath(benchmarkId: string, tag: string, view: Partial<CollectionView> = {}): string {
  return pathWithSearch(`${collectionsPath(benchmarkId)}/${encodeURIComponent(tag)}`, searchOf(COLLECTION_PARAMS, view));
}
