import type { BenchmarkDetail, BenchmarkRef, BenchmarkSummary, EntrantKey, LeaderboardEntry, LeaderboardView, Locale, Metric, RecentRun, Stage, TimelineLegend } from '../api/types';
import { EVALUATED_IN, RUNS_PER_TASK, STAGES, harnessRef, modelRef, stageRef, type Text } from './catalog';

/** The kind of work a benchmark's tasks ask for; it decides how their tasks, runs and trajectories are generated. */
export type TaskKind = 'coding' | 'testing' | 'ops' | 'rca';

/** Everything the demo's API knows about one benchmark; its prose lives in the site's own documents. */
export interface BenchmarkRecord {
  id: string;
  name: string;
  shortName: string;
  version: string;
  stageId: string;
  summary: Text;
  taskCount: number;
  updatedOn: string;
  metric: Omit<Metric, 'name'> & { name: Text };
  timelineLegend: Record<keyof TimelineLegend, Text>;

  /** The server's rule for the change mark: the tools whose calls count as the benchmark's key action. */
  changeTools: string[];
  kind: TaskKind;

  /** Ranked combinations as [model, harness, score, average cost in USD]. */
  ranking: [string, string, number, number][];

  /** Tasks the design names, listed before the generated ones, as [id, title]. */
  namedTasks: [string, string][];

  /** The public sample task and its text, which the benchmark's page quotes. */
  sample: { taskId: string; statement: string };

  /** The runs the first releases show on the benchmark page, as [task, model, harness]; each is that combination's first attempt. */
  listedRuns: [string, string, string][];
}

export const BENCHMARKS: BenchmarkRecord[] = [
  {
    id: 'bench-a', name: 'Bench A', shortName: 'A', version: 'v1.2', stageId: '03', taskCount: 320, updatedOn: '2026-11-20', kind: 'coding',
    summary: {
      'zh-CN': '在真实代码仓库中按需求完成功能实现，以仓库内的隐藏测试判定是否通过。',
      en: 'Implement a feature in a real code repository; hidden tests in the repository decide whether it passes.',
    },
    metric: { name: { 'zh-CN': '通过率', en: 'Pass rate' }, unit: 'percent', higherIsBetter: true },
    timelineLegend: {
      action: { 'zh-CN': '一步操作', en: 'A step' }, change: { 'zh-CN': '修改代码', en: 'Code change' },
      submitPassed: { 'zh-CN': '提交并通过', en: 'Submitted, passed' }, submitFailed: { 'zh-CN': '提交未通过', en: 'Submitted, failed' },
    },
    changeTools: ['edit_file'],
    ranking: [
      ['jia', 'x', 0.724, 1.2], ['yi', 'x', 0.681, 0.94], ['bing', 'y', 0.617, 0.52], ['jia', 'y', 0.602, 1.05],
      ['ding', 'x', 0.559, 0.31], ['yi', 'z', 0.513, 0.88], ['bing', 'x', 0.47, 0.47], ['wu', 'y', 0.416, 0.22],
      ['ji', 'x', 0.368, 0.4], ['geng', 'z', 0.295, 0.18], ['ding', 'y', 0.264, 0.29], ['wu', 'x', 0.221, 0.2],
      ['ji', 'y', 0.187, 0.37], ['geng', 'x', 0.125, 0.16],
    ],
    namedTasks: [
      ['task-001', '用户注册邮箱校验'], ['task-004', '订单金额精度'], ['task-009', '分页游标失效'], ['task-012', '文件上传断点续传'],
      ['task-017', '订单分页查询'], ['task-023', '配置热更新'], ['task-031', '定时任务去重'], ['task-038', '权限继承'],
      ['task-045', '搜索结果高亮'], ['task-052', '导出任务限流'], ['task-058', '多语言文案回退'], ['task-064', '导出任务重试'],
      ['task-071', '缓存键冲突'], ['task-083', '账户合并'], ['task-096', '日志脱敏'], ['task-102', '缓存失效策略'],
    ],
    sample: { taskId: 'task-017', statement: '为订单服务新增按状态筛选的分页查询接口。已有接口的行为与返回格式保持不变，新增接口的鉴权方式与现有接口一致。' },
    listedRuns: [['task-017', 'jia', 'x'], ['task-102', 'yi', 'x'], ['task-064', 'bing', 'y']],
  },
  {
    id: 'bench-b', name: 'Bench B', shortName: 'B', version: 'v1.0', stageId: '05', taskCount: 180, updatedOn: '2026-10-08', kind: 'testing',
    summary: {
      'zh-CN': '为给定的代码变更编写测试用例，以测试能否检出变更中的缺陷衡量其有效性。',
      en: 'Write tests for a given code change; their worth is whether they catch the defects hidden in the change.',
    },
    metric: { name: { 'zh-CN': '缺陷检出率', en: 'Defect detection rate' }, unit: 'percent', higherIsBetter: true },
    timelineLegend: {
      action: { 'zh-CN': '一步操作', en: 'A step' }, change: { 'zh-CN': '编写测试', en: 'Test written' },
      submitPassed: { 'zh-CN': '全部检出', en: 'All defects found' }, submitFailed: { 'zh-CN': '部分检出', en: 'Some defects found' },
    },
    changeTools: ['write_test'],
    ranking: [
      ['yi', 'x', 0.64, 1.2], ['bing', 'y', 0.612, 0.94], ['jia', 'x', 0.587, 0.52], ['ding', 'x', 0.523, 1.05],
      ['jia', 'y', 0.499, 0.31], ['yi', 'y', 0.471, 0.83], ['bing', 'x', 0.446, 0.49], ['wu', 'x', 0.402, 0.26],
      ['ji', 'y', 0.358, 0.41], ['geng', 'x', 0.301, 0.19], ['ding', 'y', 0.257, 0.33], ['wu', 'y', 0.214, 0.24],
    ],
    namedTasks: [['task-033', '优惠券叠加规则'], ['task-091', '库存扣减并发'], ['task-120', '账单导出格式']],
    sample: { taskId: 'task-033', statement: '为优惠券叠加规则的修改编写测试，覆盖满减与折扣同时生效、超过上限与使用过期券三种情形。' },
    listedRuns: [['task-033', 'jia', 'x'], ['task-091', 'yi', 'x'], ['task-120', 'bing', 'y']],
  },
  {
    id: 'bench-c', name: 'Bench C', shortName: 'C', version: 'v2.1', stageId: '07', taskCount: 120, updatedOn: '2026-11-12', kind: 'ops',
    summary: {
      'zh-CN': '在运行中的服务系统里定位故障根因并完成处置，以服务恢复情况与根因判定计分。',
      en: 'Find the root cause of a fault in a running service system and remediate it; scored on recovery and on the root cause.',
    },
    metric: { name: { 'zh-CN': '通过率', en: 'Pass rate' }, unit: 'percent', higherIsBetter: true },
    timelineLegend: {
      action: { 'zh-CN': '一步操作', en: 'A step' }, change: { 'zh-CN': '执行处置', en: 'Remediation' },
      submitPassed: { 'zh-CN': '恢复且根因正确', en: 'Recovered, cause right' }, submitFailed: { 'zh-CN': '未通过', en: 'Failed' },
    },
    changeTools: ['run_ops_command', 'edit_config'],
    ranking: [
      ['jia', 'x', 0.575, 1.2], ['ding', 'x', 0.492, 0.94], ['yi', 'x', 0.468, 0.52], ['bing', 'y', 0.44, 1.05],
      ['jia', 'y', 0.413, 0.31], ['yi', 'y', 0.382, 0.77], ['bing', 'x', 0.345, 0.58], ['wu', 'x', 0.291, 0.27],
      ['ji', 'x', 0.243, 0.39], ['geng', 'y', 0.188, 0.21],
    ],
    namedTasks: [['task-008', '支付回调超时'], ['task-044', '缓存雪崩'], ['task-071', '证书过期']],
    sample: { taskId: 'task-008', statement: '支付回调在高峰时段大量超时，部分订单的状态长时间停留在「处理中」。请定位原因并恢复服务。' },
    listedRuns: [['task-008', 'jia', 'x'], ['task-044', 'yi', 'x'], ['task-071', 'bing', 'y']],
  },
  {
    id: 'bench-d', name: 'Bench D', shortName: 'D', version: 'v1.1', stageId: '07', taskCount: 86, updatedOn: '2026-09-30', kind: 'rca',
    summary: {
      'zh-CN': '依据监控指标与日志还原故障的传播链路，以链路节点的召回衡量定位的完整程度。',
      en: 'Reconstruct how a fault spread from metrics and logs; node recall along the chain measures how complete the diagnosis is.',
    },
    metric: { name: { 'zh-CN': '节点召回均值', en: 'Mean node recall' }, unit: 'ratio', higherIsBetter: true },
    timelineLegend: {
      action: { 'zh-CN': '一步操作', en: 'A step' }, change: { 'zh-CN': '查询数据', en: 'Data query' },
      submitPassed: { 'zh-CN': '召回较高', en: 'High recall' }, submitFailed: { 'zh-CN': '召回较低', en: 'Low recall' },
    },
    changeTools: ['query_metrics', 'query_logs', 'query_traces'],
    ranking: [
      ['bing', 'y', 0.71, 1.2], ['jia', 'x', 0.68, 0.94], ['yi', 'x', 0.63, 0.52], ['ding', 'x', 0.57, 1.05],
      ['jia', 'y', 0.52, 0.31], ['yi', 'y', 0.48, 0.74], ['wu', 'x', 0.43, 0.3], ['ji', 'y', 0.37, 0.36],
      ['geng', 'x', 0.3, 0.2],
    ],
    namedTasks: [['task-052', '订单查询延迟'], ['task-019', '消息积压'], ['task-077', '数据库连接耗尽']],
    sample: { taskId: 'task-052', statement: '订单查询接口的延迟在十分钟内升高数倍，随后多个下游服务出现超时。请还原这次故障的传播链路。' },
    listedRuns: [['task-052', 'jia', 'x'], ['task-019', 'yi', 'x'], ['task-077', 'bing', 'y']],
  },
];

export function hasBenchmark(benchmarkId: string): boolean {
  return BENCHMARKS.some(record => record.id === benchmarkId);
}

export function benchmarkById(benchmarkId: string): BenchmarkRecord {
  const record = BENCHMARKS.find(candidate => candidate.id === benchmarkId);
  if (!record) {
    throw new Error(`unknown benchmark ${benchmarkId}`);
  }
  return record;
}

export function benchmarkRef(benchmarkId: string): BenchmarkRef {
  const { id, name, shortName } = benchmarkById(benchmarkId);
  return { id, name, shortName };
}

/** The eight stages, each with the benchmarks published at it. */
export function stagesWithBenchmarks(locale: Locale): Stage[] {
  return STAGES.map(stage => ({
    ...stageRef(stage.id, locale),
    summary: stage.summary[locale],
    benchmarks: BENCHMARKS.filter(record => record.stageId === stage.id).map(record => benchmarkRef(record.id)),
  }));
}

/** A combination's score and average cost on the benchmark, as its ranking records them. */
export function rankingEntryOf(benchmarkId: string, modelId: string, harnessId: string): { score: number; avgCostUsd: number } | undefined {
  const entry = benchmarkById(benchmarkId).ranking.find(([rankedModel, rankedHarness]) => rankedModel === modelId && rankedHarness === harnessId);
  return entry && { score: entry[2], avgCostUsd: entry[3] };
}

/** The given combinations ranked by their results on the benchmark, best first. */
export function leaderboardOf(benchmarkId: string, entrants: EntrantKey[], locale: Locale): LeaderboardEntry[] {
  return benchmarkById(benchmarkId).ranking
    .filter(([modelId, harnessId]) => entrants.some(entrant => entrant.modelId === modelId && entrant.harnessId === harnessId))
    .map(([modelId, harnessId, score, avgCostUsd], index) => ({
      rank: index + 1, model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale), score, runsPerTask: RUNS_PER_TASK, avgCostUsd, evaluatedIn: EVALUATED_IN,
    }));
}

/** Leaderboard entries per page when a request names no limit, as the spec declares. */
export const DEFAULT_LEADERBOARD_PAGE_SIZE = 20;

/** The combination view, or each model's (or harness's) best combination, re-ranked. */
export function leaderboardView(entries: LeaderboardEntry[], view: LeaderboardView): LeaderboardEntry[] {
  if (view === 'combination') {
    return entries;
  }
  const groupOf = (entry: LeaderboardEntry) => (view === 'model' ? entry.model.id : entry.harness.id);
  const best = entries.filter((entry, index) => entries.findIndex(other => groupOf(other) === groupOf(entry)) === index);
  return best.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** What the public site shows of a benchmark beyond its record: its summary and its ranked combinations. */
export interface BenchmarkShowing {
  summary: string;
  entries: LeaderboardEntry[];
}

export function benchmarkSummary(benchmarkId: string, showing: BenchmarkShowing, locale: Locale): BenchmarkSummary {
  const record = benchmarkById(benchmarkId);
  return {
    ...benchmarkRef(benchmarkId), version: record.version, stage: stageRef(record.stageId, locale), summary: showing.summary,
    taskCount: record.taskCount, combinationCount: showing.entries.length, runsPerTask: RUNS_PER_TASK,
    metric: { ...record.metric, name: record.metric.name[locale] }, updatedOn: record.updatedOn,
    topThree: showing.entries.slice(0, 3),
  };
}

export function benchmarkDetail(benchmarkId: string, showing: BenchmarkShowing, recentRuns: RecentRun[], locale: Locale): BenchmarkDetail {
  const { action, change, submitPassed, submitFailed } = benchmarkById(benchmarkId).timelineLegend;
  return {
    ...benchmarkSummary(benchmarkId, showing, locale), topFive: showing.entries.slice(0, 5), recentRuns,
    timelineLegend: { action: action[locale], change: change[locale], submitPassed: submitPassed[locale], submitFailed: submitFailed[locale] },
  };
}
