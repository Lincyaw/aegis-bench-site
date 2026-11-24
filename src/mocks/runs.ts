import type { CombinationRuns, GradingCheck, LabeledValue, RunDetail, RunOutcome, TaskSummary } from '../api/client';
import type { Locale } from '../i18n/locales';
import { benchmarkById, benchmarkRef, hasBenchmark, rankingEntryOf, type TaskKind } from './benchmarks';
import { HARNESSES, MODELS, PUBLISHED_ON, RECORD_LOCALE, RUNS_PER_TASK, harnessRef, modelRef } from './catalog';
import { fractionOf, hashOf, pickOf } from './hash';
import { taskOf, tasksOf, type TaskRecord } from './tasks';

/** The runs of one combination on one task share this key; a run id adds the attempt. */
export function combinationTaskKey(benchmarkId: string, taskId: string, modelId: string, harnessId: string): string {
  return `${benchmarkId}.${taskId}.${modelId}-${harnessId}`;
}

export function runIdOf(benchmarkId: string, taskId: string, modelId: string, harnessId: string, attempt: number): string {
  return `${combinationTaskKey(benchmarkId, taskId, modelId, harnessId)}.${attempt}`;
}

export interface RunKey {
  benchmarkId: string;
  taskId: string;
  modelId: string;
  harnessId: string;
  attempt: number;
}

/** The parts of a run id, or nothing when any part names no benchmark, task, model, harness or attempt. */
export function parseRunId(runId: string): RunKey | undefined {
  const [benchmarkId, taskId, combination, attemptText] = runId.split('.');
  const [modelId, harnessId] = (combination ?? '').split('-');
  const attempt = Number(attemptText);
  const known = hasBenchmark(benchmarkId) && taskOf(benchmarkId, taskId) !== undefined
    && MODELS.some(model => model.id === modelId) && HARNESSES.some(harness => harness.id === harnessId)
    && Number.isInteger(attempt) && attempt >= 1 && attempt <= RUNS_PER_TASK;
  return known ? { benchmarkId, taskId, modelId, harnessId, attempt } : undefined;
}

/** The run the design walks through: Bench A task-017, 模型甲 with 框架 X, attempt 4. */
export const SHOWCASE_RUN_ID = runIdOf('bench-a', 'task-017', 'jia', 'x', 4);

/** The design's task-017 matrix: each combination's five runs, P for passed and F for failed. */
export const SHOWCASE_OUTCOMES: Record<string, string> = Object.fromEntries(([
  ['jia', 'x', 'PPPFF'], ['yi', 'x', 'PPPPF'], ['bing', 'y', 'PPPFF'], ['jia', 'y', 'PPPPP'],
  ['ding', 'x', 'PPPPF'], ['yi', 'z', 'PPFFF'], ['bing', 'x', 'PPPPF'], ['wu', 'y', 'PPPFF'],
] as const).map(([modelId, harnessId, outcomes]) => [combinationTaskKey('bench-a', 'task-017', modelId, harnessId), outcomes]));

/** About one run in eighty fails to execute; the others pass with a chance set by the combination's score and the task. */
export function outcomeOf(key: RunKey): RunOutcome {
  const combination = combinationTaskKey(key.benchmarkId, key.taskId, key.modelId, key.harnessId);
  const runId = runIdOf(key.benchmarkId, key.taskId, key.modelId, key.harnessId, key.attempt);
  const showcase = SHOWCASE_OUTCOMES[combination];
  if (showcase) {
    return showcase[key.attempt - 1] === 'P' ? 'passed' : 'failed';
  }
  if (fractionOf(`exec:${runId}`) < 0.012) {
    return 'executionFailed';
  }
  const entry = rankingEntryOf(key.benchmarkId, key.modelId, key.harnessId);
  const difficulty = (fractionOf(`task:${key.benchmarkId}.${key.taskId}`) - 0.5) * 0.7;
  const chance = Math.min(0.97, Math.max(0.03, (entry?.score ?? 0.3) + difficulty));
  return fractionOf(runId) < chance ? 'passed' : 'failed';
}

export function taskRunsOf(benchmarkId: string, taskId: string, locale: Locale): CombinationRuns[] {
  return benchmarkById(benchmarkId).ranking.map(([modelId, harnessId]) => ({
    model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale),
    runs: Array.from({ length: RUNS_PER_TASK }, (_, index) => {
      const attempt = index + 1;
      return { id: runIdOf(benchmarkId, taskId, modelId, harnessId, attempt), attempt, outcome: outcomeOf({ benchmarkId, taskId, modelId, harnessId, attempt }) };
    }),
  }));
}

/** Share of passed runs among the runs that count; execution failures are not model results. */
export function passRateOf(combinations: CombinationRuns[]): number {
  const counted = combinations.flatMap(combination => combination.runs).filter(run => run.outcome !== 'executionFailed');
  return counted.filter(run => run.outcome === 'passed').length / counted.length;
}

const summaryCache = new Map<string, TaskSummary[]>();

export function taskSummariesOf(benchmarkId: string): TaskSummary[] {
  const cached = summaryCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const summaries = tasksOf(benchmarkId).map(task => ({ id: task.id, title: task.title, passRate: passRateOf(taskRunsOf(benchmarkId, task.id, RECORD_LOCALE)) }));
  summaryCache.set(benchmarkId, summaries);
  return summaries;
}

const MODULES = ['orders', 'users', 'billing', 'search', 'files', 'notifications'];

/** Everything a generated run needs to stay consistent across its detail and its trajectory. */
export interface RunPlan {
  key: RunKey;
  runId: string;
  task: TaskRecord;
  kind: TaskKind;
  outcome: RunOutcome;
  steps: number;
  submitSteps: number[];
  checks: Omit<GradingCheck, 'passed'>[];
  failingIds: string[];
  module: string;
}

export const TASK_017_CHECKS: [string, string, GradingCheck['method']][] = [
  ['C01', '已有接口的返回格式不变', 'hiddenTest'], ['C02', '按状态筛选返回正确的订单', 'hiddenTest'], ['C03', '每页条数不超过上限', 'hiddenTest'],
  ['C04', '游标翻页不重复、不遗漏', 'hiddenTest'], ['C05', '翻页之间排序稳定', 'hiddenTest'], ['C06', '未知状态返回参数错误', 'hiddenTest'],
  ['C07', '状态为空时的参数校验', 'hiddenTest'], ['C08', '游标格式错误时返回参数错误', 'hiddenTest'], ['C09', '无结果时返回空页', 'hiddenTest'],
  ['C10', '单页上限可配置', 'hiddenTest'], ['C11', '越界游标返回空页', 'hiddenTest'], ['C12', '订单详情接口不受影响', 'hiddenTest'],
  ['C13', '已有分页参数保持兼容', 'hiddenTest'], ['C14', '返回字段与接口文档一致', 'hiddenTest'], ['C15', '新接口与现有接口鉴权一致', 'script'],
  ['C16', '查询使用已有索引', 'script'], ['C17', 'report.json 格式正确', 'script'], ['C18', '改动说明与实际改动一致', 'modelReview'],
];

export const CODING_CHECKS: [string, string, GradingCheck['method']][] = [
  ['C01', '已有测试全部通过', 'hiddenTest'], ['C02', '新增行为符合需求说明', 'hiddenTest'], ['C03', '边界输入的处理', 'hiddenTest'],
  ['C04', '错误输入返回明确的错误', 'hiddenTest'], ['C05', '已有接口的行为不变', 'hiddenTest'], ['C06', '并发请求下结果一致', 'hiddenTest'],
  ['C07', '配置项缺省时的行为', 'hiddenTest'], ['C08', '数据库迁移可回滚', 'script'], ['C09', 'report.json 格式正确', 'script'],
  ['C10', '改动说明与实际改动一致', 'modelReview'],
];

export const REVIEW_RUBRIC = '对照最终提交的改动与 report.json：每处改动都有对应说明、说明不描述未发生的改动时记为通过；任一说明与实际改动不符记为未通过。';
export const REVIEW_SAMPLES = 3;

export function checksOf(kind: TaskKind, taskId: string): Omit<GradingCheck, 'passed'>[] {
  const review = (id: string, title: string) => ({ id, title, method: 'modelReview' as const, samples: REVIEW_SAMPLES, rubric: REVIEW_RUBRIC });
  switch (kind) {
    case 'coding':
      return (taskId === 'task-017' ? TASK_017_CHECKS : CODING_CHECKS).map(([id, title, method]) => (method === 'modelReview' ? review(id, title) : { id, title, method }));
    case 'testing':
      return [
        { id: 'S1', title: '测试在正确版本上全部通过', method: 'script' },
        ...[1, 2, 3, 4, 5].map(number => ({ id: `D${number}`, title: `缺陷版本 ${number} 被检出`, method: 'hiddenTest' as const })),
      ];
    case 'ops':
      return [
        { id: 'H1', title: '服务健康检查通过', method: 'script' }, { id: 'H2', title: '关键接口错误率恢复到基线', method: 'script' },
        { ...review('R1', '根因判定正确'), rubric: '根因结论须指出触发故障的组件与机制，并与处置操作对应；只描述表象或给出多个并列猜测记为未通过。' },
        review('R2', '处置说明与实际操作一致'),
      ];
    case 'rca':
      return [
        ...[1, 2, 3, 4, 5].map(number => ({ id: `N${number}`, title: `链路节点 ${number} 被召回`, method: 'script' as const })),
        { id: 'O1', title: '节点顺序与参考链路一致', method: 'script' },
      ];
  }
}

/** A run's length, submissions and failing checks, drawn from its id; the showcase run follows the design. */
export function planOf(runId: string): RunPlan | undefined {
  const key = parseRunId(runId);
  if (!key) {
    return undefined;
  }
  const task = taskOf(key.benchmarkId, key.taskId)!;
  const kind = benchmarkById(key.benchmarkId).kind;
  const outcome = outcomeOf(key);
  const checks = checksOf(kind, task.id);
  if (runId === SHOWCASE_RUN_ID) {
    return { key, runId, task, kind, outcome, steps: 41, submitSteps: [26, 41], checks, failingIds: ['C07', 'C11', 'C15'], module: 'orders' };
  }
  const steps = outcome === 'executionFailed' ? 6 + (hashOf(`len:${runId}`) % 8) : 18 + (hashOf(`len:${runId}`) % 50);
  const submitCount = kind === 'coding' && outcome !== 'executionFailed' ? 1 + (hashOf(`sub:${runId}`) % 3) : 1;
  const submitSteps = Array.from({ length: submitCount }, (_, index) => Math.round((steps * (index + 1)) / submitCount));
  const candidates = checks.filter(check => check.method !== 'modelReview' && check.id !== 'S1');
  const failCount = outcome === 'failed' ? 1 + (hashOf(`fails:${runId}`) % Math.min(3, candidates.length - 1)) : 0;
  const failingIds = candidates
    .map(check => ({ id: check.id, order: fractionOf(`fail:${runId}.${check.id}`) }))
    .sort((a, b) => a.order - b.order).slice(0, failCount).map(check => check.id);
  return { key, runId, task, kind, outcome, steps, submitSteps, checks, failingIds, module: task.id === 'task-017' ? 'orders' : pickOf(MODULES, task.id) };
}

export function environmentOf(plan: RunPlan): LabeledValue[] {
  const repository: LabeledValue = { label: '代码仓库', value: `${plan.module}-service @ ${(hashOf(plan.task.id) >>> 4).toString(16).slice(0, 7).padStart(7, '0')}`, format: 'code' };
  const budget = { label: '轮次上限', value: '100 轮' };
  const singleSubmission = { label: '提交', value: '一次，提交后运行结束' };
  switch (plan.kind) {
    case 'coding': return [
      repository, { label: '语言与依赖', value: 'Python 3.12 · FastAPI · SQLAlchemy' },
      { label: '可用工具', value: '读取文件、修改文件、运行命令、提交' }, { label: '网络', value: '不可访问外网' },
      budget, { label: '提交', value: '次数不限，以最后一次提交为准' },
    ];
    case 'testing': return [
      repository, { label: '被测变更', value: `变更 #${hashOf(plan.task.id) % 900 + 100}` },
      { label: '可用工具', value: '读取文件、新增测试文件、运行测试、提交' }, { label: '网络', value: '不可访问外网' },
      budget, singleSubmission,
    ];
    case 'ops': return [
      { label: '服务系统', value: '订单与支付服务，共 12 个服务' }, { label: '观测数据', value: '指标、日志与调用链，覆盖故障前后两小时' },
      { label: '可用工具', value: '查询指标、查询日志、查询调用链、执行运维命令、修改配置、提交' }, { label: '网络', value: '仅可访问服务系统' },
      budget, singleSubmission,
    ];
    case 'rca': return [
      { label: '观测数据', value: '故障时段的指标、日志与调用链' }, { label: '服务拓扑', value: '18 个服务' },
      { label: '可用工具', value: '读取拓扑、查询指标、查询日志、查询调用链、提交' }, { label: '权限', value: '只读' },
      budget, singleSubmission,
    ];
  }
}

export const REPORT_SCHEMA: Record<TaskKind, string> = {
  coding: '{ "files": [ { "path": string, "reason": string } ], "tests_run": boolean }',
  testing: '{ "tests": [ { "path": string, "covers": string } ] }',
  ops: '{ "root_cause": string, "actions": [ string ], "recovered": boolean }',
  rca: '{ "chain": [ { "service": string, "symptom": string } ] }',
};

/** The work requirements every task of the kind shares, which follow the user's question in the task text. */
export const INSTRUCTION_TAIL: Record<TaskKind, string> = {
  coding: '完成后请运行项目已有的测试，并在仓库根目录写一份 report.json，列出改动的文件和每处改动的理由。report.json 的格式如下：',
  testing: '新增的测试放在 tests/ 目录下，完成后在仓库根目录写一份 report.json，说明每个测试覆盖的情形。report.json 的格式如下：',
  ops: '处置完成后，在工作目录写一份 report.json，给出根因结论、执行过的处置操作以及服务是否已恢复。report.json 的格式如下：',
  rca: '请在工作目录写一份 report.json，按从源头到表象的顺序列出故障传播经过的服务。report.json 的格式如下：',
};

export function filesOf(plan: RunPlan): RunDetail['output']['submission']['files'] {
  const base = `src/${plan.module}`;
  switch (plan.kind) {
    case 'coding': return [
      {
        path: `${base}/api.py`, additions: 18, deletions: 2,
        patch: plan.task.id === 'task-017' ? [
          '@@ -41,6 +41,14 @@',
          '  @router.get("/orders/{order_id}", dependencies=[Depends(require_session)])',
          '  def get_order(order_id: int): ...',
          '+ @router.get("/orders")',
          '+ def list_orders_by_status(status: str = "", cursor: str | None = None):',
          '+     if status and status not in OrderStatus.values():',
          '+         raise HTTPException(400, "unknown status")',
          '+     return repo.page_by_status(status, cursor, limit=20)',
          '- # TODO: support filtering by status',
        ] : [
          '@@ -12,4 +12,9 @@',
          `  from ${plan.module}.repository import repo`,
          `+ @router.post("/${plan.module}/batch")`,
          '+ def handle_batch(items: list[Item]):',
          '+     validated = [item for item in items if item.is_valid()]',
          '+     return repo.save_all(validated)',
        ],
      },
      { path: `${base}/repository.py`, additions: 22, deletions: 4 },
      { path: 'report.json', additions: 6, deletions: 0 },
    ];
    case 'testing': return [
      {
        path: `tests/test_${plan.module}_rules.py`, additions: 48, deletions: 0,
        patch: ['@@ -0,0 +1,48 @@', `+ def test_${plan.module}_rule_applies_once():`, '+     result = apply_rules(sample_cart(), rules=[full_reduction, discount])', '+     assert result.total == Decimal("72.00")'],
      },
      { path: 'report.json', additions: 9, deletions: 0 },
    ];
    case 'ops': return [
      { path: 'config/payment-callback.yaml', additions: 1, deletions: 1, patch: ['@@ -8,3 +8,3 @@', '  callback:', '-   pool_size: 8', '+   pool_size: 32'] },
      { path: 'report.json', additions: 7, deletions: 0 },
    ];
    case 'rca': return [
      { path: 'report.json', additions: 14, deletions: 0, patch: ['@@ -0,0 +1,14 @@', '+ { "chain": [', '+   { "service": "order-db", "symptom": "连接数达到上限" },', '+   { "service": "order-api", "symptom": "查询延迟升高" },', '+   { "service": "gateway", "symptom": "下游超时" } ] }'] },
    ];
  }
}

export function replyOf(plan: RunPlan): string {
  switch (plan.kind) {
    case 'coding': return plan.task.id === 'task-017'
      ? '已新增 GET /orders 接口，支持按状态筛选和游标分页，鉴权方式与现有接口一致。已运行项目测试，12 项全部通过。改动说明见 report.json。'
      : `已完成「${plan.task.title}」相关改动，并运行了项目已有的测试，全部通过。改动说明见 report.json。`;
    case 'testing': return '已新增 6 个测试，覆盖需求说明中的全部情形；测试在当前代码上全部通过。说明见 report.json。';
    case 'ops': return '回调线程池在高峰时段被占满，导致回调排队超时。已将线程池扩大到 32 并重启服务，错误率已回落。结论见 report.json。';
    case 'rca': return '故障从 order-db 连接耗尽开始，经 order-api 传到 gateway。链路见 report.json。';
  }
}

/** The public check code and this run's result for the checks the showcase run fails. */
export const SHOWCASE_CHECK_CODE: Record<string, { path: string; source: string; observed: string; detail: string }> = {
  C07: {
    path: 'tests/hidden/test_orders_status.py',
    source: 'def test_empty_status_is_rejected(client, session):\n    resp = client.get("/orders", params={"status": ""}, cookies=session)\n    assert resp.status_code == 400',
    observed: '返回 200，包含 20 条订单。',
    detail: 'status 为空字符串时应返回参数错误，实际返回了全部订单。',
  },
  C11: {
    path: 'tests/hidden/test_orders_cursor.py',
    source: 'def test_cursor_past_last_page_returns_empty(client, session):\n    resp = client.get("/orders", params={"status": "paid", "cursor": LAST_PAGE_CURSOR + "1"}, cookies=session)\n    assert resp.status_code == 200 and resp.json()["items"] == []',
    observed: '返回 500。',
    detail: '游标超过最后一页时应返回空页，实际返回服务器错误。',
  },
  C15: {
    path: 'tests/hidden/check_auth.py',
    source: 'def check_new_route_requires_session(app):\n    route = find_route(app, "GET", "/orders")\n    assert require_session in route.dependencies',
    observed: '新接口没有依赖 require_session，未登录也能访问。',
    detail: '新接口应与现有接口使用同一鉴权方式，实际未登录也能访问。',
  },
};

export function gradingOf(plan: RunPlan): RunDetail['grading'] {
  const checks = plan.checks.map(check => {
    const passed = !plan.failingIds.includes(check.id);
    const code = plan.task.id === 'task-017' ? SHOWCASE_CHECK_CODE[check.id] : undefined;
    return passed || !code ? { ...check, passed } : { ...check, passed, code: { path: code.path, source: code.source }, observed: code.observed };
  });
  return {
    checks, passCount: checks.filter(check => check.passed).length, total: checks.length,
    codeUrl: `https://aegis-bench.org/benchmarks/${plan.key.benchmarkId}/tasks/${plan.task.id}/grading.tar.gz`,
  };
}

export function conclusionOf(plan: RunPlan, failedTitles: string[]): string {
  if (plan.runId === SHOWCASE_RUN_ID) {
    return '模型在第 26 步看到 4 项检查未通过后，只补充了状态参数的枚举校验，没有重新运行测试便再次提交。空状态、越界游标与鉴权三项在最后一次提交中仍未处理。';
  }
  const listed = failedTitles.join('、');
  switch (plan.kind) {
    case 'coding': return plan.submitSteps.length > 1
      ? `模型在第 ${plan.submitSteps[0]} 步看到检查未通过后，只修改了部分实现便再次提交；「${listed}」在最后一次提交中仍未处理。`
      : `模型提交前没有运行与需求相关的测试；「${listed}」未处理。`;
    case 'testing': return `模型编写的测试只覆盖了正常路径，没有构造边界输入，因此「${listed}」未被检出。`;
    case 'ops': return `模型重启服务后错误率短暂下降，便据此提交了结论；「${listed}」未满足，根因结论只描述了表象。`;
    case 'rca': return `模型从告警最多的服务开始倒推，遗漏了源头节点；「${listed}」未满足。`;
  }
}

/** The failed checks of a failed run, with a human review conclusion for about three runs in five. */
export function failureOf(plan: RunPlan, grading: RunDetail['grading']): RunDetail['failure'] {
  if (plan.outcome !== 'failed') {
    return undefined;
  }
  const failed = grading.checks.filter(check => !check.passed);
  const showcaseCodes = plan.task.id === 'task-017' ? SHOWCASE_CHECK_CODE : {};
  const failedChecks = failed.map(check => ({ id: check.id, title: check.title, detail: showcaseCodes[check.id]?.detail ?? `${check.title}：本次运行未满足。` }));
  const reviewed = plan.runId === SHOWCASE_RUN_ID || fractionOf(`review:${plan.runId}`) < 0.6;
  const last = plan.submitSteps[plan.submitSteps.length - 1];
  const evidenceSteps = plan.submitSteps.length > 1 ? [plan.submitSteps[0], last] : [Math.max(2, last - 5), last];
  return reviewed
    ? { failedChecks, review: { text: conclusionOf(plan, failed.map(check => check.title)), reviewedOn: PUBLISHED_ON, evidenceSteps } }
    : { failedChecks };
}

/** A run's record: display names in the reader's locale, everything the run itself produced as it was recorded. */
export function runDetailOf(runId: string, locale: Locale): RunDetail | undefined {
  const plan = planOf(runId);
  if (!plan) {
    return undefined;
  }
  const { key, kind, task } = plan;
  const entry = rankingEntryOf(key.benchmarkId, key.modelId, key.harnessId);
  const grading = gradingOf(plan);
  const lastSubmit = plan.submitSteps[plan.submitSteps.length - 1];
  const harness = harnessRef(key.harnessId, locale);
  return {
    id: runId, benchmark: benchmarkRef(key.benchmarkId), task: { id: task.id, title: task.title },
    model: modelRef(key.modelId, locale), harness, attempt: key.attempt, attemptCount: RUNS_PER_TASK, outcome: plan.outcome,
    metrics: {
      steps: plan.steps, durationMinutes: Math.max(2, Math.round(plan.steps * 0.44)), submissions: plan.submitSteps.length,
      outputTokens: plan.steps * 1460, costUsd: Math.round((entry?.avgCostUsd ?? 0.5) * (plan.steps / 36) * 100) / 100,
      endReason: plan.outcome === 'executionFailed' ? 'executionError' : 'submitted',
    },
    input: {
      instruction: `${task.statement}\n\n${INSTRUCTION_TAIL[kind]}`, reportSchema: REPORT_SCHEMA[kind], environment: environmentOf(plan),
      harness: { ...harness, version: '2.1', toolDefinitionsUrl: `https://aegis-bench.org/harness/${key.harnessId}/v2.1/tools.json` },
    },
    output: {
      submission: { attempt: plan.submitSteps.length, step: lastSubmit, files: filesOf(plan) },
      finalReply: { step: lastSubmit, text: replyOf(plan) },
      artifacts: [{ name: 'report.json', url: `https://aegis-bench.org/runs/${runId}/report.json` }],
      patchUrl: `https://aegis-bench.org/runs/${runId}/submission.patch`,
    },
    grading, failure: failureOf(plan, grading),
  };
}
