import type { Locale, RecentRun, RunDetail, SubmissionVerdict, TimelineMark, TimelineStep, Trajectory, TrajectoryStep } from '../api/types';
import { benchmarkById, type TaskKind } from './benchmarks';
import { RECORD_LOCALE } from './catalog';
import { hashOf, pickOf } from './hash';
import { SHOWCASE_RUN_ID, planOf, runIdOf, runRecordOf, type RunPlan, type RunRecord } from './runs';

/** The tools a generated run cycles through, by task kind. */
export const TOOL_PLAN: Record<TaskKind, string[]> = {
  coding: ['read_file', 'read_file', 'run_command', 'edit_file', 'read_file', 'edit_file', 'run_command'],
  testing: ['read_file', 'read_file', 'write_test', 'run_tests', 'read_file', 'write_test', 'run_tests'],
  ops: ['query_metrics', 'query_logs', 'query_traces', 'query_metrics', 'run_ops_command', 'query_metrics', 'edit_config'],
  rca: ['read_topology', 'query_metrics', 'query_logs', 'query_traces', 'query_metrics', 'query_logs'],
};

export const SERVICES = ['order-api', 'payment-callback', 'inventory', 'user-center', 'gateway', 'search-api', 'billing-worker', 'order-db'];

/** One tool call of a trajectory: its arguments, the agent's sentence and the environment's reply. */
export interface GeneratedCall {
  tool: string;
  args: Record<string, unknown>;
  message: string;
  result: string;
}

export function callOf(plan: RunPlan, tool: string, step: number): GeneratedCall {
  const base = `src/${plan.module}`;
  const service = pickOf(SERVICES, `${plan.runId}.${step}`);
  switch (tool) {
    case 'read_file': {
      const path = pickOf([`${base}/api.py`, `${base}/repository.py`, `${base}/models.py`, `tests/${plan.module}/test_api.py`], `${plan.runId}.${step}`);
      return { tool, args: { path }, message: `查看 ${path} 中与需求相关的实现。`, result: `${path}：共 ${120 + (hashOf(path) % 200)} 行。` };
    }
    case 'edit_file': {
      const path = pickOf([`${base}/api.py`, `${base}/repository.py`], `${plan.runId}.${step}`);
      return { tool, args: { path, change: '按需求修改实现' }, message: `修改 ${path}，补充需求要求的处理。`, result: `${path} 已更新（+${3 + (step % 7)} 行）。` };
    }
    case 'run_command':
      return { tool, args: { command: `pytest tests/${plan.module} -q` }, message: '运行已有测试，确认改动没有破坏原有行为。', result: `${10 + (step % 5)} passed in 3.${step % 9}s` };
    case 'write_test': {
      const path = `tests/test_${plan.module}_rules.py`;
      return { tool, args: { path, change: '新增测试用例' }, message: `在 ${path} 中补充一组测试用例。`, result: `${path} 已更新（+${8 + (step % 9)} 行）。` };
    }
    case 'run_tests':
      return { tool, args: { command: `pytest tests/test_${plan.module}_rules.py -q` }, message: '在当前代码上运行新增的测试。', result: `${4 + (step % 4)} passed in 1.${step % 9}s` };
    case 'query_metrics':
      return { tool, args: { query: `p99_latency{service="${service}"}` }, message: `查看 ${service} 的延迟与错误率曲线。`, result: `${service} 的 p99 延迟在故障开始后升高到 ${800 + (step % 9) * 120} ms。` };
    case 'query_logs':
      return { tool, args: { query: `service:${service} level:error` }, message: `检索 ${service} 的错误日志。`, result: `${service}：近 30 分钟 ${40 + (step % 13) * 17} 条错误，多为超时。` };
    case 'query_traces':
      return { tool, args: { service }, message: `查看经过 ${service} 的慢调用链。`, result: `最慢的调用链在 ${pickOf(SERVICES, `${service}.down`)} 上停留最久。` };
    case 'read_topology':
      return { tool, args: {}, message: '读取服务拓扑，确定上下游关系。', result: '共 18 个服务，order-api 依赖 order-db 与 inventory。' };
    case 'run_ops_command':
      return { tool, args: { command: `kubectl rollout restart deploy/${service}` }, message: `重启 ${service}，观察错误率是否回落。`, result: `deployment.apps/${service} restarted` };
    case 'edit_config':
      return { tool, args: { path: `config/${service}.yaml` }, message: `调整 ${service} 的连接池配置。`, result: `config/${service}.yaml 已更新。` };
    default:
      throw new Error(`no generated call for tool ${tool}`);
  }
}

/** Steps 22 to 28 of the design's task-017 walkthrough. */
export const SHOWCASE_STEPS: Record<number, GeneratedCall> = {
  22: { tool: 'read_file', args: { path: 'src/orders/api.py' }, message: '查看现有订单接口使用的鉴权装饰器。', result: 'src/orders/api.py：共 214 行。' },
  23: { tool: 'edit_file', args: { path: 'src/orders/api.py', change: '新增 list_orders_by_status' }, message: '新增 list_orders_by_status 接口，复用现有鉴权。', result: 'src/orders/api.py 已更新（+12 行）。' },
  24: { tool: 'run_command', args: { command: 'pytest tests/orders -q' }, message: '运行已有测试。', result: '12 passed in 3.4s' },
  25: { tool: 'edit_file', args: { path: 'src/orders/repository.py', change: '按状态与游标查询订单' }, message: '按状态与游标查询订单，限制单页条数。', result: 'src/orders/repository.py 已更新（+3 行）。' },
  27: { tool: 'read_file', args: { path: 'tests/orders/test_api.py' }, message: '查看已有测试对参数校验的写法。', result: 'tests/orders/test_api.py：共 96 行。' },
  28: { tool: 'edit_file', args: { path: 'src/orders/api.py', change: '状态参数枚举校验' }, message: '为状态参数增加枚举校验。', result: 'src/orders/api.py 已更新（+4 行）。' },
};

/** The submit step at the given index of a run's submissions: earlier submissions fail more checks than the last. */
export function submissionStepOf(plan: RunPlan, index: number): { message: string; result: string; submission: SubmissionVerdict } {
  const total = plan.checks.length;
  const last = index === plan.submitSteps.length - 1;
  const failing = last ? plan.failingIds.length : Math.min(total - 1, plan.failingIds.length + plan.submitSteps.length - 1 - index);
  const passed = last ? plan.outcome === 'passed' : failing === 0;
  const passedChecks = plan.runId === SHOWCASE_RUN_ID ? (last ? 15 : 14) : total - failing;
  return {
    message: plan.kind === 'coding' ? `第 ${index + 1} 次提交当前改动。` : '提交结论与报告。',
    result: plan.kind === 'coding' ? `第 ${index + 1} 次提交：通过 ${passedChecks} / ${total} 项检查。` : '已提交，运行结束。',
    submission: { passed, passedChecks, totalChecks: total },
  };
}

const RUN_DAY_START = Date.parse('2026-11-18T09:00:00Z');
const SECONDS_PER_STEP = 26;

/** The run's trajectory in ATIF-v1.8, a record in its original language: the task as the user step, then one agent step per tool call. */
export function trajectoryOf(runId: string): Trajectory | undefined {
  const plan = planOf(runId);
  const detail = runRecordOf(runId, RECORD_LOCALE);
  if (!plan || !detail) {
    return undefined;
  }
  const start = RUN_DAY_START + (hashOf(runId) % 86400) * 1000;
  const timestampOf = (step: number) => new Date(start + step * SECONDS_PER_STEP * 1000).toISOString();
  const steps: TrajectoryStep[] = [{ step_id: 1, timestamp: timestampOf(0), source: 'user', message: `${detail.input.instruction}\n\n${detail.input.reportSchema}` }];
  const tools = TOOL_PLAN[plan.kind];
  let promptTokens = 2400;
  for (let step = 2; step <= plan.steps; step++) {
    const submitIndex = plan.submitSteps.indexOf(step);
    const toolCallId = `call_${step}`;
    promptTokens += 900 + (hashOf(`${runId}.${step}`) % 700);
    const completionTokens = 120 + (hashOf(`${runId}.c${step}`) % 400);
    const metrics = { prompt_tokens: promptTokens, completion_tokens: completionTokens, cached_tokens: Math.round(promptTokens * 0.8), cost_usd: Math.round((promptTokens * 1.5e-6 + completionTokens * 6e-6) * 10000) / 10000 };
    if (submitIndex >= 0) {
      const submit = submissionStepOf(plan, submitIndex);
      steps.push({
        step_id: step, timestamp: timestampOf(step), source: 'agent', message: submit.message,
        tool_calls: [{ tool_call_id: toolCallId, function_name: 'submit', arguments: { report: 'report.json' } }],
        observation: { results: [{ source_call_id: toolCallId, content: submit.result, extra: { submission: submit.submission } }] },
        metrics, llm_call_count: 1,
      });
    } else {
      const tool = tools[(step + hashOf(runId)) % tools.length];
      const call = (plan.runId === SHOWCASE_RUN_ID ? SHOWCASE_STEPS[step] : undefined) ?? callOf(plan, tool, step);
      steps.push({
        step_id: step, timestamp: timestampOf(step), source: 'agent', message: call.message,
        tool_calls: [{ tool_call_id: toolCallId, function_name: call.tool, arguments: call.args }],
        observation: { results: [{ source_call_id: toolCallId, content: call.result }] },
        metrics, llm_call_count: 1,
      });
    }
  }
  const trajectory: Trajectory = {
    schema_version: 'ATIF-v1.8', session_id: runId, trajectory_id: runId,
    agent: { name: detail.harness.name, version: detail.input.harness.version, model_name: detail.model.name },
    steps,
  };
  const agent = trajectory.steps.filter(step => step.source === 'agent');
  const total =(field: 'prompt_tokens' | 'completion_tokens' | 'cached_tokens' | 'cost_usd') => agent.reduce((sum, step) => sum + (step.metrics?.[field] ?? 0), 0);
  return {
    ...trajectory,
    final_metrics: {
      total_prompt_tokens: total('prompt_tokens'), total_completion_tokens: total('completion_tokens'), total_cached_tokens: total('cached_tokens'),
      total_cost_usd: Math.round(total('cost_usd') * 100) / 100, total_steps: steps.length,
    },
  };
}

/** A recent run's result in its benchmark's own words, such as 检出 3/5. */
export function resultLabelOf(kind: TaskKind, detail: RunRecord, locale: Locale): string {
  const { passCount, total, checks } = detail.grading;
  const english = locale === 'en';
  switch (kind) {
    case 'testing': {
      const found = checks.filter(check => check.id.startsWith('D') && check.passed).length;
      return found === 5 ? (english ? 'All found' : '全部检出') : (english ? `Found ${found}/5` : `检出 ${found}/5`);
    }
    case 'rca': {
      const recall = (checks.filter(check => check.id.startsWith('N') && check.passed).length / 5).toFixed(2);
      return english ? `Recall ${recall}` : `召回 ${recall}`;
    }
    case 'coding':
    case 'ops':
      switch (detail.outcome) {
        case 'passed': return english ? 'Passed' : '通过';
        case 'failed': return english ? `Failed · ${passCount}/${total}` : `未通过 · ${passCount}/${total}`;
        case 'executionFailed': return english ? 'Execution failed' : '执行失败';
      }
  }
}

/** The server's marking rule for a step: a submission by its verdict, a call to one of the benchmark's change tools as a change, any other step as an action. */
export function markOf(step: TrajectoryStep, changeTools: string[]): TimelineMark {
  const submission = (step.observation?.results[0]?.extra as { submission?: SubmissionVerdict } | undefined)?.submission;
  if (submission) {
    return submission.passed ? 'submitPassed' : 'submitFailed';
  }
  const tool = step.tool_calls?.[0]?.function_name;
  return tool !== undefined && changeTools.includes(tool) ? 'change' : 'action';
}

/** Every agent step of a trajectory with its mark, in step order. */
export function timelineOf(trajectory: Trajectory, changeTools: string[]): TimelineStep[] {
  return trajectory.steps.filter(step => step.source === 'agent').map(step => ({ stepId: step.step_id, mark: markOf(step, changeTools) }));
}

/** A run's detail: its record, with each step of its trajectory marked by the benchmark's rules. */
export function runDetailOf(runId: string, locale: Locale): RunDetail | undefined {
  const record = runRecordOf(runId, locale);
  const trajectory = trajectoryOf(runId);
  if (!record || !trajectory) {
    return undefined;
  }
  return { ...record, timeline: timelineOf(trajectory, benchmarkById(record.benchmark.id).changeTools) };
}

/** The runs a benchmark page lists, each its combination's first attempt. */
export function recentRunsOf(benchmarkId: string, locale: Locale): RecentRun[] {
  const { kind, listedRuns } = benchmarkById(benchmarkId);
  return listedRuns.map(([taskId, modelId, harnessId]) => {
    const runId = runIdOf(benchmarkId, taskId, modelId, harnessId, 1);
    const detail = runDetailOf(runId, locale);
    if (!detail) {
      throw new Error(`${benchmarkId} lists run ${runId}, which has no record`);
    }
    return {
      runId, model: detail.model, task: detail.task, outcome: detail.outcome, resultLabel: resultLabelOf(kind, detail, locale),
      stepCount: detail.metrics.steps, durationMinutes: detail.metrics.durationMinutes, timeline: detail.timeline,
    };
  });
}
