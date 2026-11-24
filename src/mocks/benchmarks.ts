import type { BenchmarkDetail, BenchmarkRef, BenchmarkSummary, LeaderboardEntry, LeaderboardView, RecentRun, Stage } from '../api/client';
import { EVALUATED_IN, RUNS_PER_TASK, STAGES, harnessById, modelById, stageRef } from './catalog';

/** The kind of work a benchmark's tasks ask for; it decides how their tasks, runs and trajectories are generated. */
export type TaskKind = 'coding' | 'testing' | 'ops' | 'rca';

/** The page copy of a benchmark; counts, rankings and listed runs are derived from the rest of its record. */
type BenchmarkCopy = Omit<BenchmarkDetail, 'combinationCount' | 'runsPerTask' | 'topThree' | 'topFive' | 'recentRuns' | 'bibtex' | 'faq'>;

/** Everything the demo knows about one benchmark. */
export interface BenchmarkRecord {
  copy: BenchmarkCopy;
  kind: TaskKind;

  /** Ranked combinations as [model, harness, score, average cost in USD]. */
  ranking: [string, string, number, number][];

  /** Tasks the design names, listed before the generated ones, as [id, title]. */
  namedTasks: [string, string][];

  /** The runs the benchmark page lists, as [task, model, harness]; each shows that combination's first attempt. */
  listedRuns: [string, string, string][];
}

const BIBTEX = '@inproceedings{aegisbench2027,\n  title     = {论文标题},\n  author    = {作者},\n  booktitle = {会议名称},\n  year      = {2027}\n}';

const FAQ = [
  { question: '评测结果如何复现？', answer: '公开任务、评测框架与运行配置均随版本发布，按评测方法中的步骤即可在本地复现相同的结果。' },
  { question: '如何申请评测我的模型？', answer: '请通过「联系我们」中的邮箱提交申请，说明模型的访问方式与希望参评的评测基准。' },
  { question: '评测基准多久更新一次？', answer: '评测基准按版本更新，每个版本的任务与评测配置固定；每次更新的内容见版本记录与更新日志。' },
];

const SHARED_CONDITIONS = [
  { label: '运行次数', value: `每道任务独立运行 ${RUNS_PER_TASK} 次` },
  { label: '运行预算', value: '单次运行至多 100 轮交互' },
  { label: '统一条件', value: '相同的评测框架、轮次预算与执行环境' },
];

export const BENCHMARKS: BenchmarkRecord[] = [
  {
    kind: 'coding',
    copy: {
      id: 'bench-a', name: 'Bench A', shortName: 'A', version: 'v1.2', stage: stageRef('03'),
      summary: '在真实代码仓库中按需求完成功能实现，以仓库内的隐藏测试判定是否通过。',
      taskCount: 320, updatedOn: '2026-11-20',
      metric: { name: '通过率', unit: 'percent', higherIsBetter: true },
      setting: {
        intro: '智能体在隔离的开发环境中工作，获得与工程师完成同一需求时相同的信息与工具。',
        flow: [
          { title: '智能体获得', body: '需求说明、完整的代码仓库，以及可执行的开发环境。' },
          { title: '工作方式', body: '可读写仓库、执行命令并运行已有测试；不可访问外部网络。' },
          { title: '需要提交', body: '对代码仓库的修改。可多次提交，以最后一次提交为准。' },
        ],
        sample: { task: { id: 'task-017', title: '订单分页查询' }, statement: '为订单服务新增按状态筛选的分页查询接口。已有接口的行为与返回格式保持不变，新增接口的鉴权方式与现有接口一致。' },
      },
      evaluation: {
        intro: '每道任务以仓库内不向智能体公开的测试判定结果，所有模型在相同条件下运行。',
        flow: [
          { title: '提交内容', body: '智能体提交的代码修改，在全新环境中重新构建。' },
          { title: '检查项', body: '功能测试与回归测试，在提交后统一执行。' },
          { title: '计分', body: `全部测试通过记为通过；报告每道任务 ${RUNS_PER_TASK} 次运行的平均通过率。` },
        ],
        conditions: [{ label: '指标', value: '通过率，数值越高越好' }, ...SHARED_CONDITIONS],
      },
      timelineLegend: { action: '一步操作', change: '修改代码', submitPassed: '提交并通过', submitFailed: '提交未通过', changeTools: ['edit_file'] },
      versions: [
        { version: 'v1.2', releasedOn: '2026-11-20', note: '新增 40 道任务，覆盖并发控制与缓存场景。' },
        { version: 'v1.1', releasedOn: '2026-09-02', note: '统一运行预算为每次至多 100 轮交互。' },
        { version: 'v1.0', releasedOn: '2026-06-15', note: '首次发布，共 280 道任务。' },
      ],
    },
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
    listedRuns: [['task-017', 'jia', 'x'], ['task-102', 'yi', 'x'], ['task-064', 'bing', 'y']],
  },
  {
    kind: 'testing',
    copy: {
      id: 'bench-b', name: 'Bench B', shortName: 'B', version: 'v1.0', stage: stageRef('05'),
      summary: '为给定的代码变更编写测试用例，以测试能否检出变更中的缺陷衡量其有效性。',
      taskCount: 180, updatedOn: '2026-10-08',
      metric: { name: '缺陷检出率', unit: 'percent', higherIsBetter: true },
      setting: {
        intro: '智能体针对一次代码变更编写测试，所写测试须在正确的代码上通过。',
        flow: [
          { title: '智能体获得', body: '代码仓库、一次代码变更及其需求说明，以及可执行的测试环境。' },
          { title: '工作方式', body: '可阅读代码、运行已有测试并新增测试文件；不可修改被测代码。' },
          { title: '需要提交', body: '新增的测试用例。提交后本次运行结束。' },
        ],
        sample: { task: { id: 'task-033', title: '优惠券叠加规则' }, statement: '为优惠券叠加规则的修改编写测试，覆盖满减与折扣同时生效、超过上限与使用过期券三种情形。' },
      },
      evaluation: {
        intro: '以一组不向智能体公开的缺陷版本检验测试：在缺陷版本上失败、在正确版本上通过的测试才计为检出。',
        flow: [
          { title: '提交内容', body: '智能体提交的测试用例，先在正确版本上运行，须全部通过。' },
          { title: '检查项', body: '在每个缺陷版本上运行同一组测试，记录被检出的缺陷。' },
          { title: '计分', body: `检出的缺陷占缺陷总数的比例；报告每道任务 ${RUNS_PER_TASK} 次运行的平均值。` },
        ],
        conditions: [{ label: '指标', value: '缺陷检出率，数值越高越好' }, ...SHARED_CONDITIONS],
      },
      timelineLegend: { action: '一步操作', change: '编写测试', submitPassed: '全部检出', submitFailed: '部分检出', changeTools: ['write_test'] },
      versions: [{ version: 'v1.0', releasedOn: '2026-10-08', note: '首次发布，共 180 道任务。' }],
    },
    ranking: [
      ['yi', 'x', 0.64, 1.2], ['bing', 'y', 0.612, 0.94], ['jia', 'x', 0.587, 0.52], ['ding', 'x', 0.523, 1.05],
      ['jia', 'y', 0.499, 0.31], ['yi', 'y', 0.471, 0.83], ['bing', 'x', 0.446, 0.49], ['wu', 'x', 0.402, 0.26],
      ['ji', 'y', 0.358, 0.41], ['geng', 'x', 0.301, 0.19], ['ding', 'y', 0.257, 0.33], ['wu', 'y', 0.214, 0.24],
    ],
    namedTasks: [['task-033', '优惠券叠加规则'], ['task-091', '库存扣减并发'], ['task-120', '账单导出格式']],
    listedRuns: [['task-033', 'jia', 'x'], ['task-091', 'yi', 'x'], ['task-120', 'bing', 'y']],
  },
  {
    kind: 'ops',
    copy: {
      id: 'bench-c', name: 'Bench C', shortName: 'C', version: 'v2.1', stage: stageRef('07'),
      summary: '在运行中的服务系统里定位故障根因并完成处置，以服务恢复情况与根因判定计分。',
      taskCount: 120, updatedOn: '2026-11-12',
      metric: { name: '通过率', unit: 'percent', higherIsBetter: true },
      setting: {
        intro: '智能体面对一个正在发生故障的服务系统，拥有与值班工程师相同的观测与操作权限。',
        flow: [
          { title: '智能体获得', body: '故障现象的描述、服务系统的访问入口，以及监控、日志与调用链数据。' },
          { title: '工作方式', body: '可查询观测数据、执行运维命令并修改配置；所有操作均被完整记录。' },
          { title: '需要提交', body: '根因结论与处置说明。提交后本次运行结束。' },
        ],
        sample: { task: { id: 'task-008', title: '支付回调超时' }, statement: '支付回调在高峰时段大量超时，部分订单的状态长时间停留在「处理中」。请定位原因并恢复服务。' },
      },
      evaluation: {
        intro: '每道任务同时检查服务是否恢复、根因结论是否正确，所有模型在相同条件下运行。',
        flow: [
          { title: '提交内容', body: '根因结论、处置说明，以及运行期间执行的全部操作。' },
          { title: '检查项', body: '服务健康检查与根因判定，根因判定依据公开的评分细则。' },
          { title: '计分', body: `服务恢复且根因正确记为通过；报告每道任务 ${RUNS_PER_TASK} 次运行的平均通过率。` },
        ],
        conditions: [{ label: '指标', value: '通过率，数值越高越好' }, ...SHARED_CONDITIONS],
      },
      timelineLegend: { action: '一步操作', change: '执行处置', submitPassed: '恢复且根因正确', submitFailed: '未通过', changeTools: ['run_ops_command', 'edit_config'] },
      versions: [
        { version: 'v2.1', releasedOn: '2026-11-12', note: '修订根因判定的评分细则。' },
        { version: 'v2.0', releasedOn: '2026-08-20', note: '迁移至新的服务拓扑，共 120 道任务。' },
        { version: 'v1.0', releasedOn: '2026-04-02', note: '首次发布。' },
      ],
    },
    ranking: [
      ['jia', 'x', 0.575, 1.2], ['ding', 'x', 0.492, 0.94], ['yi', 'x', 0.468, 0.52], ['bing', 'y', 0.44, 1.05],
      ['jia', 'y', 0.413, 0.31], ['yi', 'y', 0.382, 0.77], ['bing', 'x', 0.345, 0.58], ['wu', 'x', 0.291, 0.27],
      ['ji', 'x', 0.243, 0.39], ['geng', 'y', 0.188, 0.21],
    ],
    namedTasks: [['task-008', '支付回调超时'], ['task-044', '缓存雪崩'], ['task-071', '证书过期']],
    listedRuns: [['task-008', 'jia', 'x'], ['task-044', 'yi', 'x'], ['task-071', 'bing', 'y']],
  },
  {
    kind: 'rca',
    copy: {
      id: 'bench-d', name: 'Bench D', shortName: 'D', version: 'v1.1', stage: stageRef('07'),
      summary: '依据监控指标与日志还原故障的传播链路，以链路节点的召回衡量定位的完整程度。',
      taskCount: 86, updatedOn: '2026-09-30',
      metric: { name: '节点召回均值', unit: 'ratio', higherIsBetter: true },
      setting: {
        intro: '智能体只能读取故障期间的观测数据，需要还原故障从源头到表象的传播过程。',
        flow: [
          { title: '智能体获得', body: '故障时段的监控指标、日志与调用链数据，以及服务拓扑。' },
          { title: '工作方式', body: '只读查询观测数据；不能访问或修改运行中的系统。' },
          { title: '需要提交', body: '故障传播链路，按从源头到表象的顺序列出受影响的服务。' },
        ],
        sample: { task: { id: 'task-052', title: '订单查询延迟' }, statement: '订单查询接口的延迟在十分钟内升高数倍，随后多个下游服务出现超时。请还原这次故障的传播链路。' },
      },
      evaluation: {
        intro: '提交的链路与参考链路逐节点比对，所有模型在相同条件下运行。',
        flow: [
          { title: '提交内容', body: '按顺序列出的故障传播链路。' },
          { title: '检查项', body: '逐个节点与参考链路比对，并检查先后顺序。' },
          { title: '计分', body: `链路节点的召回率；报告每道任务 ${RUNS_PER_TASK} 次运行的平均值。` },
        ],
        conditions: [{ label: '指标', value: '节点召回均值，数值越高越好' }, ...SHARED_CONDITIONS],
      },
      timelineLegend: { action: '一步操作', change: '查询数据', submitPassed: '召回较高', submitFailed: '召回较低', changeTools: ['query_metrics', 'query_logs', 'query_traces'] },
      versions: [
        { version: 'v1.1', releasedOn: '2026-09-30', note: '补充 12 道多服务级联故障。' },
        { version: 'v1.0', releasedOn: '2026-07-10', note: '首次发布，共 74 道任务。' },
      ],
    },
    ranking: [
      ['bing', 'y', 0.71, 1.2], ['jia', 'x', 0.68, 0.94], ['yi', 'x', 0.63, 0.52], ['ding', 'x', 0.57, 1.05],
      ['jia', 'y', 0.52, 0.31], ['yi', 'y', 0.48, 0.74], ['wu', 'x', 0.43, 0.3], ['ji', 'y', 0.37, 0.36],
      ['geng', 'x', 0.3, 0.2],
    ],
    namedTasks: [['task-052', '订单查询延迟'], ['task-019', '消息积压'], ['task-077', '数据库连接耗尽']],
    listedRuns: [['task-052', 'jia', 'x'], ['task-019', 'yi', 'x'], ['task-077', 'bing', 'y']],
  },
];

export function hasBenchmark(benchmarkId: string): boolean {
  return BENCHMARKS.some(record => record.copy.id === benchmarkId);
}

export function benchmarkById(benchmarkId: string): BenchmarkRecord {
  const record = BENCHMARKS.find(candidate => candidate.copy.id === benchmarkId);
  if (!record) {
    throw new Error(`unknown benchmark ${benchmarkId}`);
  }
  return record;
}

export function benchmarkRef(benchmarkId: string): BenchmarkRef {
  const { id, name, shortName } = benchmarkById(benchmarkId).copy;
  return { id, name, shortName };
}

/** The eight stages, each with the benchmarks published at it. */
export function stagesWithBenchmarks(): Stage[] {
  return STAGES.map(stage => ({
    ...stage,
    benchmarks: BENCHMARKS.filter(record => record.copy.stage.id === stage.id).map(record => benchmarkRef(record.copy.id)),
  }));
}

export function leaderboardOf(benchmarkId: string): LeaderboardEntry[] {
  return benchmarkById(benchmarkId).ranking.map(([modelId, harnessId, score, avgCostUsd], index) => ({
    rank: index + 1, model: modelById(modelId), harness: harnessById(harnessId), score, runsPerTask: RUNS_PER_TASK, avgCostUsd, evaluatedIn: EVALUATED_IN,
  }));
}

/** The combination view, or each model's (or harness's) best combination, re-ranked. */
export function leaderboardView(benchmarkId: string, view: LeaderboardView): LeaderboardEntry[] {
  const entries = leaderboardOf(benchmarkId);
  if (view === 'combination') {
    return entries;
  }
  const groupOf = (entry: LeaderboardEntry) => (view === 'model' ? entry.model.id : entry.harness.id);
  const best = entries.filter((entry, index) => entries.findIndex(other => groupOf(other) === groupOf(entry)) === index);
  return best.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function benchmarkSummary(benchmarkId: string): BenchmarkSummary {
  const { copy, ranking } = benchmarkById(benchmarkId);
  const { id, name, shortName, version, stage, summary, taskCount, metric, updatedOn } = copy;
  return {
    id, name, shortName, version, stage, summary, taskCount, metric, updatedOn,
    combinationCount: ranking.length, runsPerTask: RUNS_PER_TASK, topThree: leaderboardOf(id).slice(0, 3),
  };
}

export function benchmarkDetail(benchmarkId: string, recentRuns: RecentRun[]): BenchmarkDetail {
  return {
    ...benchmarkById(benchmarkId).copy, ...benchmarkSummary(benchmarkId),
    topFive: leaderboardOf(benchmarkId).slice(0, 5), recentRuns, bibtex: BIBTEX, faq: FAQ,
  };
}
