import { createContext, useContext } from 'react';
import type { BenchmarkDetail } from '../api/client';

/** The benchmark whose page a document is the body of; the document's data blocks read it. */
export const BenchmarkContext = createContext<BenchmarkDetail | null>(null);

export function useCurrentBenchmark(): BenchmarkDetail {
  const benchmark = useContext(BenchmarkContext);
  if (!benchmark) {
    throw new Error('A benchmark block is used outside a benchmark page');
  }
  return benchmark;
}
