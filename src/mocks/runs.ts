import type {
  CombinationRuns, GradingCheck, HarnessRef, LabeledValue, ModelRef, RecentRun, RunDetail, RunOutcome, TaskSummary, Trajectory,
  TrajectoryStep,
} from '../api/client';
import { markOf, type SubmissionResult } from '../trajectory';
import { benchmarkCopy, leaderboardOf, modelById, HARNESSES } from './catalog';

/** FNV-1a: every generated value depends only on its key, so the demo is the same on every load. */
export function hashOf(key: string): number {
  let hash = 0x811c9dc5;
  for (const char of key) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function fraction(key: string): number {
  return hashOf(key) / 0x100000000;
}

function pick<T>(items: readonly T[], key: string): T {
  return items[hashOf(key) % items.length];
}

type Kind = 'coding' | 'testing' | 'ops' | 'rca';

const KIND_OF: Record<string, Kind> = { 'bench-a': 'coding', 'bench-b': 'testing', 'bench-c': 'ops', 'bench-d': 'rca' };

const KNOWN_TASKS: Record<string, [string, string][]> = {
  'bench-a': [
    ['task-001', '用户注册邮箱校验'], ['task-004', '订单金额精度'], ['task-009', '分页游标失效'], ['task-012', '文件上传断点续传'],
    ['task-017', '订单分页查询'], ['task-023', '配置热更新'], ['task-031', '定时任务去重'], ['task-038', '权限继承'],
    ['task-045', '搜索结果高亮'], ['task-052', '导出任务限流'], ['task-058', '多语言文案回退'], ['task-064', '导出任务重试'],
    ['task-071', '缓存键冲突'], ['task-083', '账户合并'], ['task-096', '日志脱敏'], ['task-102', '缓存失效策略'],
  ],
  'bench-b': [['task-033', '优惠券叠加规则'], ['task-091', '库存扣减并发'], ['task-120', '账单导出格式']],
  'bench-c': [['task-008', '支付回调超时'], ['task-044', '缓存雪崩'], ['task-071', '证书过期']],
  'bench-d': [['task-052', '订单查询延迟'], ['task-019', '消息积压'], ['task-077', '数据库连接耗尽']],
};

const TITLE_POOL: Record<Kind, string[]> = {
  coding: ['批量导入去重', '接口限流配置', '订单状态机补全', '软删除恢复', '分片上传合并', '时区换算修正', '幂等键校验', '审计日志补全', '密码策略更新', '报表导出分批', '通知模板渲染', '多租户隔离', '重试退避策略', '配置项校验', '数据迁移脚本', '会话过期处理'],
  testing: ['积分过期规则', '运费计算', '库存预占回滚', '退款金额拆分', '会员等级升级', '订单合并发货', '价格舍入', '发票抬头校验', '秒杀限购', '地址解析', '优惠码大小写', '汇率换算'],
  ops: ['磁盘写满', '配置下发错误', 'DNS 解析失败', '线程池耗尽', '慢查询拖垮主库', '限流阈值过低', '依赖降级失效', '内存泄漏', '消息重复消费', '节点时钟漂移', '证书链缺失', '缓存击穿'],
  rca: ['支付链路超时', '登录服务抖动', '搜索延迟升高', '推荐服务雪崩', '网关错误率上升', '库存服务超时', '报表任务积压', '对象存储读取缓慢', '注册服务失败', '配置中心不可用'],
};

interface TaskRecord {
  id: string;
  title: string;
  statement: string;
}

function statementOf(benchmarkId: string, id: string, title: string): string {
  const sample = benchmarkCopy(benchmarkId).setting.sample;
  if (sample.task.id === id) {
    return sample.statement;
  }
  switch (KIND_OF[benchmarkId]) {
    case 'coding': return `为服务新增「${title}」相关的功能。已有接口的行为与返回格式保持不变。`;
    case 'testing': return `为「${title}」相关的代码变更编写测试，覆盖需求说明中列出的全部情形。`;
    case 'ops': return `线上出现「${title}」相关的故障现象，部分请求失败或超时。请定位原因并恢复服务。`;
    case 'rca': return `「${title}」期间多个服务出现异常。请还原这次故障的传播链路。`;
  }
}

const taskCache = new Map<string, TaskRecord[]>();

/** The benchmark's public tasks: the ones the design names first, then generated ones up to the task count. */
export function tasksOf(benchmarkId: string): TaskRecord[] {
  const cached = taskCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const known = KNOWN_TASKS[benchmarkId].map(([id, title]) => ({ id, title }));
  const knownIds = new Set(known.map(task => task.id));
  const pool = TITLE_POOL[KIND_OF[benchmarkId]];
  const generated: { id: string; title: string }[] = [];
  for (let n = 1; known.length + generated.length < benchmarkCopy(benchmarkId).taskCount; n++) {
    const id = `task-${String(n).padStart(3, '0')}`;
    if (!knownIds.has(id)) {
      generated.push({ id, title: pool[generated.length % pool.length] });
    }
  }
  const tasks = [...known, ...generated].map(task => ({ ...task, statement: statementOf(benchmarkId, task.id, task.title) }));
  taskCache.set(benchmarkId, tasks);
  return tasks;
}

export function taskOf(benchmarkId: string, taskId: string): TaskRecord | undefined {
  return tasksOf(benchmarkId).find(task => task.id === taskId);
}

/** The design's task-017 matrix: each combination's five runs, P for passed and F for failed. */
const SHOWCASE_OUTCOMES: Record<string, string> = {
  'bench-a.task-017.jia-x': 'PPPFF', 'bench-a.task-017.yi-x': 'PPPPF', 'bench-a.task-017.bing-y': 'PPPFF',
  'bench-a.task-017.jia-y': 'PPPPP', 'bench-a.task-017.ding-x': 'PPPPF', 'bench-a.task-017.yi-z': 'PPFFF',
  'bench-a.task-017.bing-x': 'PPPPF', 'bench-a.task-017.wu-y': 'PPPFF',
};

export function runIdOf(benchmarkId: string, taskId: string, modelId: string, harnessId: string, attempt: number): string {
  return `${benchmarkId}.${taskId}.${modelId}-${harnessId}.${attempt}`;
}

interface RunKey {
  benchmarkId: string;
  taskId: string;
  model: ModelRef;
  harness: HarnessRef;
  attempt: number;
}

export function parseRunId(runId: string): RunKey | undefined {
  const [benchmarkId, taskId, combination, attempt] = runId.split('.');
  const [modelId, harnessId] = (combination ?? '').split('-');
  const harness = HARNESSES.find(item => item.id === harnessId);
  if (!KIND_OF[benchmarkId] || !taskOf(benchmarkId, taskId) || !harness || !(Number(attempt) >= 1 && Number(attempt) <= 5)) {
    return undefined;
  }
  return { benchmarkId, taskId, model: modelById(modelId), harness, attempt: Number(attempt) };
}

function outcomeOf(key: RunKey): RunOutcome {
  const combination = `${key.benchmarkId}.${key.taskId}.${key.model.id}-${key.harness.id}`;
  const showcase = SHOWCASE_OUTCOMES[combination];
  if (showcase) {
    return showcase[key.attempt - 1] === 'P' ? 'passed' : 'failed';
  }
  const runKey = `${combination}.${key.attempt}`;
  if (fraction(`exec:${runKey}`) < 0.012) {
    return 'executionFailed';
  }
  const entry = leaderboardOf(key.benchmarkId).find(item => item.model.id === key.model.id && item.harness.id === key.harness.id);
  const difficulty = (fraction(`task:${key.benchmarkId}.${key.taskId}`) - 0.5) * 0.7;
  const chance = Math.min(0.97, Math.max(0.03, (entry?.score ?? 0.3) + difficulty));
  return fraction(runKey) < chance ? 'passed' : 'failed';
}

export function taskRunsOf(benchmarkId: string, taskId: string): CombinationRuns[] {
  return leaderboardOf(benchmarkId).map(({ model, harness }) => ({
    model, harness,
    runs: [1, 2, 3, 4, 5].map(attempt => ({
      id: runIdOf(benchmarkId, taskId, model.id, harness.id, attempt), attempt,
      outcome: outcomeOf({ benchmarkId, taskId, model, harness, attempt }),
    })),
  }));
}

/** Share of passed runs among the runs that count; execution failures are not model results. */
export function passRateOf(combinations: CombinationRuns[]): number {
  const counted = combinations.flatMap(item => item.runs).filter(run => run.outcome !== 'executionFailed');
  return counted.filter(run => run.outcome === 'passed').length / counted.length;
}

const summaryCache = new Map<string, TaskSummary[]>();

export function taskSummariesOf(benchmarkId: string): TaskSummary[] {
  const cached = summaryCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const summaries = tasksOf(benchmarkId).map(task => ({ id: task.id, title: task.title, passRate: passRateOf(taskRunsOf(benchmarkId, task.id)) }));
  summaryCache.set(benchmarkId, summaries);
  return summaries;
}

const MODULES = ['orders', 'users', 'billing', 'search', 'files', 'notifications'];
const SERVICES = ['order-api', 'payment-callback', 'inventory', 'user-center', 'gateway', 'search-api', 'billing-worker', 'order-db'];

/** Everything a generated run needs to stay consistent across its detail and its trajectory. */
interface RunPlan {
  key: RunKey;
  runId: string;
  task: TaskRecord;
  kind: Kind;
  outcome: RunOutcome;
  steps: number;
  submitSteps: number[];
  checks: Omit<GradingCheck, 'passed'>[];
  failingIds: string[];
  module: string;
}

const SHOWCASE_RUN = 'bench-a.task-017.jia-x.4';

const TASK_017_CHECKS: [string, string, GradingCheck['method']][] = [
  ['C01', '已有接口的返回格式不变', 'hiddenTest'], ['C02', '按状态筛选返回正确的订单', 'hiddenTest'], ['C03', '每页条数不超过上限', 'hiddenTest'],
  ['C04', '游标翻页不重复、不遗漏', 'hiddenTest'], ['C05', '翻页之间排序稳定', 'hiddenTest'], ['C06', '未知状态返回参数错误', 'hiddenTest'],
  ['C07', '状态为空时的参数校验', 'hiddenTest'], ['C08', '游标格式错误时返回参数错误', 'hiddenTest'], ['C09', '无结果时返回空页', 'hiddenTest'],
  ['C10', '单页上限可配置', 'hiddenTest'], ['C11', '越界游标返回空页', 'hiddenTest'], ['C12', '订单详情接口不受影响', 'hiddenTest'],
  ['C13', '已有分页参数保持兼容', 'hiddenTest'], ['C14', '返回字段与接口文档一致', 'hiddenTest'], ['C15', '新接口与现有接口鉴权一致', 'script'],
  ['C16', '查询使用已有索引', 'script'], ['C17', 'report.json 格式正确', 'script'], ['C18', '改动说明与实际改动一致', 'modelReview'],
];

const RUBRIC = '对照最终提交的改动与 report.json：每处改动都有对应说明、说明不描述未发生的改动时记为通过；任一说明与实际改动不符记为未通过。';

function checksOf(kind: Kind, taskId: string): Omit<GradingCheck, 'passed'>[] {
  const review = (id: string, title: string) => ({ id, title, method: 'modelReview' as const, samples: 3, rubric: RUBRIC });
  switch (kind) {
    case 'coding': {
      const list: [string, string, GradingCheck['method']][] = taskId === 'task-017' ? TASK_017_CHECKS : [
        ['C01', '已有测试全部通过', 'hiddenTest'], ['C02', '新增行为符合需求说明', 'hiddenTest'], ['C03', '边界输入的处理', 'hiddenTest'],
        ['C04', '错误输入返回明确的错误', 'hiddenTest'], ['C05', '已有接口的行为不变', 'hiddenTest'], ['C06', '并发请求下结果一致', 'hiddenTest'],
        ['C07', '配置项缺省时的行为', 'hiddenTest'], ['C08', '数据库迁移可回滚', 'script'], ['C09', 'report.json 格式正确', 'script'],
        ['C10', '改动说明与实际改动一致', 'modelReview'],
      ];
      return list.map(([id, title, method]) => (method === 'modelReview' ? review(id, title) : { id, title, method }));
    }
    case 'testing':
      return [
        { id: 'S1', title: '测试在正确版本上全部通过', method: 'script' },
        ...[1, 2, 3, 4, 5].map(n => ({ id: `D${n}`, title: `缺陷版本 ${n} 被检出`, method: 'hiddenTest' as const })),
      ];
    case 'ops':
      return [
        { id: 'H1', title: '服务健康检查通过', method: 'script' }, { id: 'H2', title: '关键接口错误率恢复到基线', method: 'script' },
        { ...review('R1', '根因判定正确'), rubric: '根因结论须指出触发故障的组件与机制，并与处置操作对应；只描述表象或给出多个并列猜测记为未通过。' },
        review('R2', '处置说明与实际操作一致'),
      ];
    case 'rca':
      return [
        ...[1, 2, 3, 4, 5].map(n => ({ id: `N${n}`, title: `链路节点 ${n} 被召回`, method: 'script' as const })),
        { id: 'O1', title: '节点顺序与参考链路一致', method: 'script' },
      ];
  }
}

function planOf(runId: string): RunPlan | undefined {
  const key = parseRunId(runId);
  if (!key) {
    return undefined;
  }
  const task = taskOf(key.benchmarkId, key.taskId)!;
  const kind = KIND_OF[key.benchmarkId];
  const outcome = outcomeOf(key);
  const checks = checksOf(kind, task.id);
  if (runId === SHOWCASE_RUN) {
    return { key, runId, task, kind, outcome, steps: 41, submitSteps: [26, 41], checks, failingIds: ['C07', 'C11', 'C15'], module: 'orders' };
  }
  const steps = outcome === 'executionFailed' ? 6 + (hashOf(`len:${runId}`) % 8) : 18 + (hashOf(`len:${runId}`) % 50);
  const submitCount = kind === 'coding' && outcome !== 'executionFailed' ? 1 + (hashOf(`sub:${runId}`) % 3) : 1;
  const submitSteps = Array.from({ length: submitCount }, (_, index) => Math.round((steps * (index + 1)) / submitCount));
  const candidates = checks.filter(check => check.method !== 'modelReview' && check.id !== 'S1');
  const failCount = outcome === 'failed' ? 1 + (hashOf(`fails:${runId}`) % Math.min(3, candidates.length - 1)) : 0;
  const failingIds = candidates
    .map(check => ({ id: check.id, order: fraction(`fail:${runId}.${check.id}`) }))
    .sort((a, b) => a.order - b.order).slice(0, failCount).map(item => item.id);
  return { key, runId, task, kind, outcome, steps, submitSteps, checks, failingIds, module: task.id === 'task-017' ? 'orders' : pick(MODULES, task.id) };
}

function environmentOf(plan: RunPlan): LabeledValue[] {
  const repo = `${plan.module}-service @ ${(hashOf(plan.task.id) >>> 4).toString(16).slice(0, 7).padStart(7, '0')}`;
  switch (plan.kind) {
    case 'coding': return [
      { label: '代码仓库', value: repo }, { label: '语言与依赖', value: 'Python 3.12 · FastAPI · SQLAlchemy' },
      { label: '可用工具', value: '读取文件、修改文件、运行命令、提交' }, { label: '网络', value: '不可访问外网' },
      { label: '轮次上限', value: '100 轮' }, { label: '提交', value: '次数不限，以最后一次提交为准' },
    ];
    case 'testing': return [
      { label: '代码仓库', value: repo }, { label: '被测变更', value: `变更 #${hashOf(plan.task.id) % 900 + 100}` },
      { label: '可用工具', value: '读取文件、新增测试文件、运行测试、提交' }, { label: '网络', value: '不可访问外网' },
      { label: '轮次上限', value: '100 轮' }, { label: '提交', value: '一次，提交后运行结束' },
    ];
    case 'ops': return [
      { label: '服务系统', value: '订单与支付服务，共 12 个服务' }, { label: '观测数据', value: '指标、日志与调用链，覆盖故障前后两小时' },
      { label: '可用工具', value: '查询指标、查询日志、查询调用链、执行运维命令、修改配置、提交' }, { label: '网络', value: '仅可访问服务系统' },
      { label: '轮次上限', value: '100 轮' }, { label: '提交', value: '一次，提交后运行结束' },
    ];
    case 'rca': return [
      { label: '观测数据', value: '故障时段的指标、日志与调用链' }, { label: '服务拓扑', value: '18 个服务' },
      { label: '可用工具', value: '读取拓扑、查询指标、查询日志、查询调用链、提交' }, { label: '权限', value: '只读' },
      { label: '轮次上限', value: '100 轮' }, { label: '提交', value: '一次，提交后运行结束' },
    ];
  }
}

const REPORT_SCHEMA: Record<Kind, string> = {
  coding: '{ "files": [ { "path": string, "reason": string } ], "tests_run": boolean }',
  testing: '{ "tests": [ { "path": string, "covers": string } ] }',
  ops: '{ "root_cause": string, "actions": [ string ], "recovered": boolean }',
  rca: '{ "chain": [ { "service": string, "symptom": string } ] }',
};

const INSTRUCTION_TAIL: Record<Kind, string> = {
  coding: '完成后请运行项目已有的测试，并在仓库根目录写一份 report.json，列出改动的文件和每处改动的理由。report.json 的格式如下：',
  testing: '新增的测试放在 tests/ 目录下，完成后在仓库根目录写一份 report.json，说明每个测试覆盖的情形。report.json 的格式如下：',
  ops: '处置完成后，在工作目录写一份 report.json，给出根因结论、执行过的处置操作以及服务是否已恢复。report.json 的格式如下：',
  rca: '请在工作目录写一份 report.json，按从源头到表象的顺序列出故障传播经过的服务。report.json 的格式如下：',
};

function filesOf(plan: RunPlan): RunDetail['output']['submission']['files'] {
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

function replyOf(plan: RunPlan): string {
  switch (plan.kind) {
    case 'coding': return plan.task.id === 'task-017'
      ? '已新增 GET /orders 接口，支持按状态筛选和游标分页，鉴权方式与现有接口一致。已运行项目测试，12 项全部通过。改动说明见 report.json。'
      : `已完成「${plan.task.title}」相关改动，并运行了项目已有的测试，全部通过。改动说明见 report.json。`;
    case 'testing': return `已新增 6 个测试，覆盖需求说明中的全部情形；测试在当前代码上全部通过。说明见 report.json。`;
    case 'ops': return '回调线程池在高峰时段被占满，导致回调排队超时。已将线程池扩大到 32 并重启服务，错误率已回落。结论见 report.json。';
    case 'rca': return '故障从 order-db 连接耗尽开始，经 order-api 传到 gateway。链路见 report.json。';
  }
}

const CHECK_CODE: Record<string, { path: string; source: string; observed: string }> = {
  C07: {
    path: 'tests/hidden/test_orders_status.py',
    source: 'def test_empty_status_is_rejected(client, session):\n    resp = client.get("/orders", params={"status": ""}, cookies=session)\n    assert resp.status_code == 400',
    observed: '返回 200，包含 20 条订单。',
  },
  C11: {
    path: 'tests/hidden/test_orders_cursor.py',
    source: 'def test_cursor_past_last_page_returns_empty(client, session):\n    resp = client.get("/orders", params={"status": "paid", "cursor": LAST_PAGE_CURSOR + "1"}, cookies=session)\n    assert resp.status_code == 200 and resp.json()["items"] == []',
    observed: '返回 500。',
  },
  C15: {
    path: 'tests/hidden/check_auth.py',
    source: 'def check_new_route_requires_session(app):\n    route = find_route(app, "GET", "/orders")\n    assert require_session in route.dependencies',
    observed: '新接口没有依赖 require_session，未登录也能访问。',
  },
};

const FAILURE_DETAIL: Record<string, string> = {
  C07: 'status 为空字符串时应返回参数错误，实际返回了全部订单。',
  C11: '游标超过最后一页时应返回空页，实际返回服务器错误。',
  C15: '新接口应与现有接口使用同一鉴权方式，实际未登录也能访问。',
};

function gradingOf(plan: RunPlan): RunDetail['grading'] {
  const checks = plan.checks.map(check => {
    const passed = !plan.failingIds.includes(check.id);
    const code = CHECK_CODE[check.id];
    if (passed || plan.kind !== 'coding' || plan.task.id !== 'task-017' || !code) {
      return { ...check, passed };
    }
    return { ...check, passed, code: { path: code.path, source: code.source }, observed: code.observed };
  });
  return {
    checks, passCount: checks.filter(check => check.passed).length, total: checks.length,
    codeUrl: `https://aegis-bench.org/benchmarks/${plan.key.benchmarkId}/tasks/${plan.task.id}/grading.tar.gz`,
  };
}

function conclusionOf(plan: RunPlan, failedTitles: string[]): string {
  if (plan.runId === SHOWCASE_RUN) {
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

function failureOf(plan: RunPlan, grading: RunDetail['grading']): RunDetail['failure'] {
  if (plan.outcome !== 'failed') {
    return undefined;
  }
  const failed = grading.checks.filter(check => !check.passed);
  const failedChecks = failed.map(check => ({ id: check.id, title: check.title, detail: FAILURE_DETAIL[check.id] ?? `${check.title}：本次运行未满足。` }));
  const reviewed = plan.runId === SHOWCASE_RUN || fraction(`review:${plan.runId}`) < 0.6;
  if (!reviewed) {
    return { failedChecks };
  }
  const last = plan.submitSteps[plan.submitSteps.length - 1];
  const evidenceSteps = plan.submitSteps.length > 1 ? [plan.submitSteps[0], last] : [Math.max(2, last - 5), last];
  return { failedChecks, review: { text: conclusionOf(plan, failed.map(check => check.title)), reviewedOn: '2026-11-20', evidenceSteps } };
}

export function runDetailOf(runId: string): RunDetail | undefined {
  const plan = planOf(runId);
  if (!plan) {
    return undefined;
  }
  const { key, kind, task } = plan;
  const entry = leaderboardOf(key.benchmarkId).find(item => item.model.id === key.model.id && item.harness.id === key.harness.id);
  const grading = gradingOf(plan);
  const lastSubmit = plan.submitSteps[plan.submitSteps.length - 1];
  return {
    id: runId, benchmark: { id: key.benchmarkId, name: benchmarkCopy(key.benchmarkId).name }, task: { id: task.id, title: task.title },
    model: key.model, harness: key.harness, attempt: key.attempt, attemptCount: 5, outcome: plan.outcome,
    metrics: {
      turns: plan.steps, durationMinutes: Math.max(2, Math.round(plan.steps * 0.44)), submissions: plan.submitSteps.length,
      outputTokens: plan.steps * 1460, costUsd: Math.round((entry?.avgCostUsd ?? 0.5) * (plan.steps / 36) * 100) / 100,
      endReason: plan.outcome === 'executionFailed' ? '执行环境异常' : '提交后结束',
    },
    input: {
      instruction: `${task.statement}\n\n${INSTRUCTION_TAIL[kind]}`, reportSchema: REPORT_SCHEMA[kind], environment: environmentOf(plan),
      harness: { ...key.harness, version: '2.1', toolDefinitionsUrl: `https://aegis-bench.org/harness/${key.harness.id}/v2.1/tools.json` },
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

const TOOL_PLAN: Record<Kind, string[]> = {
  coding: ['read_file', 'read_file', 'run_command', 'edit_file', 'read_file', 'edit_file', 'run_command'],
  testing: ['read_file', 'read_file', 'write_test', 'run_tests', 'read_file', 'write_test', 'run_tests'],
  ops: ['query_metrics', 'query_logs', 'query_traces', 'query_metrics', 'run_ops_command', 'query_metrics', 'edit_config'],
  rca: ['read_topology', 'query_metrics', 'query_logs', 'query_traces', 'query_metrics', 'query_logs'],
};

/** Arguments, the agent's sentence and the environment's reply for one generated call. */
function callOf(plan: RunPlan, tool: string, step: number): { args: Record<string, unknown>; message: string; result: string } {
  const base = `src/${plan.module}`;
  const service = pick(SERVICES, `${plan.runId}.${step}`);
  switch (tool) {
    case 'read_file': {
      const path = pick([`${base}/api.py`, `${base}/repository.py`, `${base}/models.py`, `tests/${plan.module}/test_api.py`], `${plan.runId}.${step}`);
      return { args: { path }, message: `查看 ${path} 中与需求相关的实现。`, result: `${path}：共 ${120 + (hashOf(path) % 200)} 行。` };
    }
    case 'edit_file': {
      const path = pick([`${base}/api.py`, `${base}/repository.py`], `${plan.runId}.${step}`);
      return { args: { path, change: '按需求修改实现' }, message: `修改 ${path}，补充需求要求的处理。`, result: `${path} 已更新（+${3 + (step % 7)} 行）。` };
    }
    case 'run_command':
      return { args: { command: `pytest tests/${plan.module} -q` }, message: '运行已有测试，确认改动没有破坏原有行为。', result: `${10 + (step % 5)} passed in 3.${step % 9}s` };
    case 'write_test': {
      const path = `tests/test_${plan.module}_rules.py`;
      return { args: { path, change: '新增测试用例' }, message: `在 ${path} 中补充一组测试用例。`, result: `${path} 已更新（+${8 + (step % 9)} 行）。` };
    }
    case 'run_tests':
      return { args: { command: `pytest tests/test_${plan.module}_rules.py -q` }, message: '在当前代码上运行新增的测试。', result: `${4 + (step % 4)} passed in 1.${step % 9}s` };
    case 'query_metrics':
      return { args: { query: `p99_latency{service="${service}"}` }, message: `查看 ${service} 的延迟与错误率曲线。`, result: `${service} 的 p99 延迟在故障开始后升高到 ${800 + (step % 9) * 120} ms。` };
    case 'query_logs':
      return { args: { query: `service:${service} level:error` }, message: `检索 ${service} 的错误日志。`, result: `${service}：近 30 分钟 ${40 + (step % 13) * 17} 条错误，多为超时。` };
    case 'query_traces':
      return { args: { service }, message: `查看经过 ${service} 的慢调用链。`, result: `最慢的调用链在 ${pick(SERVICES, `${service}.down`)} 上停留最久。` };
    case 'read_topology':
      return { args: {}, message: '读取服务拓扑，确定上下游关系。', result: '共 18 个服务，order-api 依赖 order-db 与 inventory。' };
    case 'run_ops_command':
      return { args: { command: `kubectl rollout restart deploy/${service}` }, message: `重启 ${service}，观察错误率是否回落。`, result: `deployment.apps/${service} restarted` };
    case 'edit_config':
      return { args: { path: `config/${service}.yaml` }, message: `调整 ${service} 的连接池配置。`, result: `config/${service}.yaml 已更新。` };
    default:
      throw new Error(`no generated call for tool ${tool}`);
  }
}

/** Rounds 22 to 28 of the design's task-017 replay. */
const SHOWCASE_STEPS: Record<number, { tool: string; args: Record<string, unknown>; message: string; result: string }> = {
  22: { tool: 'read_file', args: { path: 'src/orders/api.py' }, message: '查看现有订单接口使用的鉴权装饰器。', result: 'src/orders/api.py：共 214 行。' },
  23: { tool: 'edit_file', args: { path: 'src/orders/api.py', change: '新增 list_orders_by_status' }, message: '新增 list_orders_by_status 接口，复用现有鉴权。', result: 'src/orders/api.py 已更新（+12 行）。' },
  24: { tool: 'run_command', args: { command: 'pytest tests/orders -q' }, message: '运行已有测试。', result: '12 passed in 3.4s' },
  25: { tool: 'edit_file', args: { path: 'src/orders/repository.py', change: '按状态与游标查询订单' }, message: '按状态与游标查询订单，限制单页条数。', result: 'src/orders/repository.py 已更新（+3 行）。' },
  27: { tool: 'read_file', args: { path: 'tests/orders/test_api.py' }, message: '查看已有测试对参数校验的写法。', result: 'tests/orders/test_api.py：共 96 行。' },
  28: { tool: 'edit_file', args: { path: 'src/orders/api.py', change: '状态参数枚举校验' }, message: '为状态参数增加枚举校验。', result: 'src/orders/api.py 已更新（+4 行）。' },
};

function submissionStepOf(plan: RunPlan, index: number): { message: string; result: string; submission: SubmissionResult } {
  const total = plan.checks.length;
  const last = index === plan.submitSteps.length - 1;
  const failing = last ? plan.failingIds.length : Math.min(total - 1, plan.failingIds.length + plan.submitSteps.length - 1 - index);
  const passed = last ? plan.outcome === 'passed' : failing === 0;
  const passedChecks = plan.runId === SHOWCASE_RUN ? (last ? 15 : 14) : total - failing;
  return {
    message: plan.kind === 'coding' ? `第 ${index + 1} 次提交当前改动。` : '提交结论与报告。',
    result: plan.kind === 'coding' ? `第 ${index + 1} 次提交：通过 ${passedChecks} / ${total} 项检查。` : '已提交，运行结束。',
    submission: { passed, passedChecks, totalChecks: total },
  };
}

/** The run's trajectory in ATIF-v1.8: the task as the user step, then one agent step per tool call. */
export function trajectoryOf(runId: string): Trajectory | undefined {
  const plan = planOf(runId);
  const detail = runDetailOf(runId);
  if (!plan || !detail) {
    return undefined;
  }
  const start = Date.parse('2026-11-18T09:00:00Z') + (hashOf(runId) % 86400) * 1000;
  const at = (step: number) => new Date(start + step * 26_000).toISOString();
  const steps: TrajectoryStep[] = [{ step_id: 1, timestamp: at(0), source: 'user', message: `${detail.input.instruction}\n\n${detail.input.reportSchema}` }];
  const tools = TOOL_PLAN[plan.kind];
  let promptTokens = 2400;
  for (let step = 2; step <= plan.steps; step++) {
    const submitIndex = plan.submitSteps.indexOf(step);
    const tool = tools[(step + hashOf(runId)) % tools.length];
    const showcase = plan.runId === SHOWCASE_RUN ? SHOWCASE_STEPS[step] : undefined;
    const call = submitIndex >= 0 ? undefined : showcase ?? { tool, ...callOf(plan, tool, step) };
    const submit = submitIndex >= 0 ? submissionStepOf(plan, submitIndex) : undefined;
    const toolCallId = `call_${step}`;
    promptTokens += 900 + (hashOf(`${runId}.${step}`) % 700);
    const completion = 120 + (hashOf(`${runId}.c${step}`) % 400);
    steps.push({
      step_id: step, timestamp: at(step), source: 'agent',
      message: submit ? submit.message : call!.message,
      tool_calls: [{ tool_call_id: toolCallId, function_name: submit ? 'submit' : call!.tool, arguments: submit ? { report: 'report.json' } : call!.args }],
      observation: { results: [{ source_call_id: toolCallId, content: submit ? submit.result : call!.result, ...(submit ? { extra: { submission: submit.submission } } : {}) }] },
      metrics: { prompt_tokens: promptTokens, completion_tokens: completion, cached_tokens: Math.round(promptTokens * 0.8), cost_usd: Math.round((promptTokens * 1.5e-6 + completion * 6e-6) * 10000) / 10000 },
      llm_call_count: 1,
    });
  }
  const agent = steps.filter(step => step.metrics);
  return {
    schema_version: 'ATIF-v1.8', session_id: runId, trajectory_id: runId,
    agent: { name: detail.harness.name, version: '2.1', model_name: detail.model.name },
    steps,
    final_metrics: {
      total_prompt_tokens: agent.reduce((sum, step) => sum + (step.metrics?.prompt_tokens ?? 0), 0),
      total_completion_tokens: agent.reduce((sum, step) => sum + (step.metrics?.completion_tokens ?? 0), 0),
      total_cached_tokens: agent.reduce((sum, step) => sum + (step.metrics?.cached_tokens ?? 0), 0),
      total_cost_usd: Math.round(agent.reduce((sum, step) => sum + (step.metrics?.cost_usd ?? 0), 0) * 100) / 100,
      total_steps: steps.length,
    },
  };
}

/** The three runs a benchmark page lists: the design's examples, with outcomes and marks read from their trajectories. */
const RECENT: Record<string, [string, string, string][]> = {
  'bench-a': [['task-017', 'jia', 'x'], ['task-102', 'yi', 'x'], ['task-064', 'bing', 'y']],
  'bench-b': [['task-033', 'jia', 'x'], ['task-091', 'yi', 'x'], ['task-120', 'bing', 'y']],
  'bench-c': [['task-008', 'jia', 'x'], ['task-044', 'yi', 'x'], ['task-071', 'bing', 'y']],
  'bench-d': [['task-052', 'jia', 'x'], ['task-019', 'yi', 'x'], ['task-077', 'bing', 'y']],
};

function resultLabelOf(kind: Kind, detail: RunDetail): string {
  const { passCount, total } = detail.grading;
  switch (kind) {
    case 'testing': {
      const found = detail.grading.checks.filter(check => check.id.startsWith('D') && check.passed).length;
      return found === 5 ? '全部检出' : `检出 ${found}/5`;
    }
    case 'rca': {
      const recalled = detail.grading.checks.filter(check => check.id.startsWith('N') && check.passed).length;
      return `召回 ${(recalled / 5).toFixed(2)}`;
    }
    default:
      return detail.outcome === 'passed' ? '通过' : detail.outcome === 'failed' ? `未通过 · ${passCount}/${total}` : '执行失败';
  }
}

export function recentRunsOf(benchmarkId: string): RecentRun[] {
  const changeTools = benchmarkCopy(benchmarkId).timelineLegend.changeTools;
  return RECENT[benchmarkId].map(([taskId, modelId, harnessId]) => {
    const first = taskRunsOf(benchmarkId, taskId).find(item => item.model.id === modelId && item.harness.id === harnessId)!.runs[0];
    const detail = runDetailOf(first.id)!;
    const trajectory = trajectoryOf(first.id)!;
    return {
      runId: first.id, model: detail.model, task: detail.task, outcome: detail.outcome, resultLabel: resultLabelOf(KIND_OF[benchmarkId], detail),
      stepCount: detail.metrics.turns, durationMinutes: detail.metrics.durationMinutes,
      timeline: trajectory.steps.filter(step => step.source === 'agent').map(step => markOf(step, changeTools)),
    };
  });
}
