import { benchmarkSectionPath } from './console';

export function consoleReportsPath(benchmarkId: string): string {
  return benchmarkSectionPath(benchmarkId, 'reports');
}

export function consoleReportPath(benchmarkId: string, reportId: string): string {
  return `${consoleReportsPath(benchmarkId)}/${reportId}`;
}
