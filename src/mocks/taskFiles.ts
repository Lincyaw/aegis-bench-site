import type { GradingCheck, TaskEntry, TaskFile, WithheldReason } from '../api/types';
import { benchmarkById, type TaskKind } from './benchmarks';
import { INSTRUCTION_TAIL, REPORT_SCHEMA, SHOWCASE_CHECK_CODE, checksOf, moduleOf } from './runs';
import { taskOf, type TaskRecord } from './tasks';

/*
 * Each public task's Harbor directory, built from the same records as the task's runs, so that the task text, the
 * check code and the rubrics read the same here as in a run's detail. The reference solution and the reference
 * answers are part of the directory: the public site withholds them, the console shows them whole.
 */

/** Entries per page of a directory when a request names no limit, as the spec declares. */
export const DEFAULT_ENTRY_PAGE_SIZE = 50;

/** No response carries more of a file's text than this, as the spec declares. */
export const MAX_FILE_TEXT_BYTES = 256 * 1024;

export interface TaskFileRecord {
  path: string;
  text: string;
  withheld?: WithheldReason;
}

const MEDIA_TYPES: Record<string, string> = {
  md: 'text/markdown', toml: 'application/toml', sh: 'application/x-sh', py: 'text/x-python', yaml: 'application/yaml',
  json: 'application/json', txt: 'text/plain', patch: 'text/x-diff',
};

export function mediaTypeOf(path: string): string {
  const name = path.split('/').at(-1) ?? path;
  if (name === 'Dockerfile') {
    return 'text/plain';
  }
  const mediaType = MEDIA_TYPES[name.split('.').at(-1) ?? ''];
  if (!mediaType) {
    throw new Error(`no media type for ${path}`);
  }
  return mediaType;
}

export function byteLengthOf(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function taskTomlOf(benchmarkId: string, task: TaskRecord, kind: TaskKind): string {
  const { version } = benchmarkById(benchmarkId);
  const network = kind === 'coding' || kind === 'testing' ? 'no-network' : 'allowlist';
  return [
    'schema_version = "1.3"', '',
    '[metadata]', `benchmark = "${benchmarkId}"`, `benchmark_version = "${version}"`, `task_id = "${task.id}"`, `title = "${task.title}"`, `kind = "${kind}"`, '',
    '[agent]', 'timeout_sec = 3600.0', '',
    '[verifier]', 'timeout_sec = 900.0', '',
    '[environment]', 'build_timeout_sec = 600.0', 'cpus = 2', 'memory_mb = 4096', `network_mode = "${network}"`, '',
  ].join('\n');
}

/** What builds the environment the agent works in. */
export function environmentFilesOf(kind: TaskKind, module: string): TaskFileRecord[] {
  switch (kind) {
    case 'coding':
    case 'testing': return [
      { path: 'environment/Dockerfile', text: 'FROM python:3.12-slim\nWORKDIR /workspace\nCOPY repo/ /workspace/\nRUN pip install --no-cache-dir -r requirements.txt\n' },
      { path: 'environment/repo/requirements.txt', text: 'fastapi==0.115.0\nsqlalchemy==2.0.36\npytest==8.3.3\n' },
      { path: `environment/repo/src/${module}/api.py`, text: `from fastapi import APIRouter, Depends\n\nfrom ${module}.auth import require_session\nfrom ${module}.repository import repo\n\nrouter = APIRouter()\n\n\n@router.get("/${module}/{item_id}", dependencies=[Depends(require_session)])\ndef get_item(item_id: int):\n    return repo.get(item_id)\n` },
      { path: `environment/repo/src/${module}/repository.py`, text: `from sqlalchemy.orm import Session\n\n\nclass Repository:\n    def __init__(self, session: Session):\n        self.session = session\n\n    def get(self, item_id: int):\n        ...\n` },
    ];
    case 'ops': return [
      { path: 'environment/docker-compose.yaml', text: 'services:\n  gateway:\n    image: demo/gateway:1.8\n  order-api:\n    image: demo/order-api:3.2\n  payment-callback:\n    image: demo/payment-callback:2.4\n    volumes:\n      - ./config/payment-callback.yaml:/etc/payment-callback.yaml\n  order-db:\n    image: postgres:16\n  telemetry:\n    image: demo/telemetry:1.0\n' },
      { path: 'environment/config/payment-callback.yaml', text: 'service: payment-callback\nlisten: 0.0.0.0:8080\ncallback:\n  timeout_ms: 3000\n  retries: 2\n  pool_size: 8\n' },
    ];
    case 'rca': return [
      { path: 'environment/docker-compose.yaml', text: 'services:\n  telemetry:\n    image: demo/telemetry:1.0\n    volumes:\n      - ./telemetry:/data:ro\n  topology:\n    image: demo/topology:1.0\n    volumes:\n      - ./topology.json:/data/topology.json:ro\n' },
      { path: 'environment/topology.json', text: `${JSON.stringify({ services: ['gateway', 'order-api', 'order-db', 'payment-api', 'inventory-api', 'search-api', 'user-api', 'session-cache'].map(name => ({ name })) }, null, 2)}\n` },
    ];
  }
}

/** The reference solution the oracle runs, which the public site withholds. */
export function solutionFilesOf(kind: TaskKind, module: string): TaskFileRecord[] {
  const solve = (...lines: string[]) => ({ path: 'solution/solve.sh', text: ['#!/usr/bin/env bash', 'set -euo pipefail', ...lines, ''].join('\n'), withheld: 'solution' as const });
  switch (kind) {
    case 'coding': return [
      solve('cd /workspace', 'git apply /solution/reference.patch'),
      {
        path: 'solution/reference.patch', withheld: 'solution',
        text: [
          `--- a/src/${module}/api.py`, `+++ b/src/${module}/api.py`, '@@ -9,3 +9,12 @@', ` @router.get("/${module}/{item_id}", dependencies=[Depends(require_session)])`, ' def get_item(item_id: int):',
          '     return repo.get(item_id)', '+', `+@router.get("/${module}", dependencies=[Depends(require_session)])`, '+def list_items(status: str, cursor: str | None = None):',
          '+    if not status or status not in Status.values():', '+        raise HTTPException(400, "unknown status")', '+    return repo.page(status, cursor, limit=settings.page_limit)', '',
        ].join('\n'),
      },
    ];
    case 'testing': return [
      solve('cp /solution/test_reference.py /workspace/tests/'),
      {
        path: 'solution/test_reference.py', withheld: 'solution',
        text: `import pytest\n\n\n@pytest.mark.parametrize("case", load_cases("${module}"))\ndef test_${module}_rules(case):\n    assert apply_rules(case.cart, case.rules).total == case.expected\n`,
      },
    ];
    case 'ops': return [solve('yq -i ".callback.pool_size = 32" /workspace/config/payment-callback.yaml', 'opsctl restart payment-callback', 'cp /solution/report.json /workspace/report.json'), { path: 'solution/report.json', withheld: 'solution', text: '{ "root_cause": "回调线程池容量不足，高峰时请求排队超时", "actions": ["pool_size 8 → 32", "重启 payment-callback"], "recovered": true }\n' }];
    case 'rca': return [solve('cp /solution/report.json /workspace/report.json'), { path: 'solution/report.json', withheld: 'solution', text: '{ "chain": [ { "service": "order-db", "symptom": "连接数达到上限" }, { "service": "order-api", "symptom": "查询延迟升高" }, { "service": "gateway", "symptom": "下游超时" } ] }\n' }];
  }
}

/** A check's code, or for a model-review check its rubric; task-017's failing checks carry the code the design shows. */
export function checkFileOf(check: Omit<GradingCheck, 'passed'>, taskId: string): TaskFileRecord {
  const showcase = taskId === 'task-017' ? SHOWCASE_CHECK_CODE[check.id] : undefined;
  if (showcase) {
    return { path: showcase.path, text: `${showcase.source}\n` };
  }
  const name = check.id.toLowerCase();
  switch (check.method) {
    case 'hiddenTest': return {
      path: `tests/hidden/test_${name}.py`,
      text: `"""${check.id} ${check.title}"""\n\n\ndef test_${name}(client, case):\n    resp = client.request(case.method, case.path, json=case.body)\n    assert resp.status_code == case.status\n`,
    };
    case 'script': return {
      path: `tests/checks/check_${name}.py`,
      text: `"""${check.id} ${check.title}"""\nimport json\n\n\ndef check_${name}(workspace, reference):\n    report = json.loads((workspace / "report.json").read_text())\n    return reference.matches("${check.id}", report)\n`,
    };
    case 'modelReview': return {
      path: `tests/review/${name}.md`,
      text: `# ${check.id} ${check.title}\n\n裁判模型独立评分 ${check.samples ?? 1} 次，取中位数。\n\n${check.rubric ?? ''}\n`,
    };
  }
}

/** The defects a testing task hides in the change, one per defect version its tests must catch. */
export const MUTANT_DEFECTS = [
  { title: '满减与折扣的叠加顺序颠倒', from: '    total = apply_discount(apply_reduction(cart))', to: '    total = apply_reduction(apply_discount(cart))' },
  { title: '上限判断少了等号', from: '    if total >= cap:', to: '    if total > cap:' },
  { title: '过期券未被拒绝', from: '    if coupon.expired(now): raise Expired()', to: '    pass' },
  { title: '金额向下取整', from: '    return total.quantize(CENT, ROUND_HALF_UP)', to: '    return total.quantize(CENT, ROUND_DOWN)' },
  { title: '同一张券可重复使用', from: '    used.add(coupon.id)', to: '    pass' },
];

/** The reference causal chain an operations or diagnosis task's grading compares the report with. */
export const GROUND_TRUTH: Record<'ops' | 'rca', object> = {
  ops: { root_cause: { component: 'payment-callback', mechanism: '回调线程池容量不足' }, recovery: { metric: 'callback_error_rate', baseline: 0.01 }, accepted_actions: ['调大 pool_size', '扩容 payment-callback'] },
  rca: { chain: [{ service: 'order-db', state: '连接数耗尽' }, { service: 'order-api', state: '查询延迟升高' }, { service: 'gateway', state: '下游超时' }], required_nodes: ['order-db', 'order-api', 'gateway'] },
};

/** What the verifier runs, and the reference answers it compares against, which are withheld. */
export function testFilesOf(kind: TaskKind, taskId: string): TaskFileRecord[] {
  const checks = checksOf(kind, taskId).map(check => checkFileOf(check, taskId));
  const run = ['#!/usr/bin/env bash', 'set -euo pipefail', 'mkdir -p /logs/verifier'];
  switch (kind) {
    case 'coding': return [
      { path: 'tests/test.sh', text: [...run, 'pytest tests/hidden --junitxml=/logs/verifier/hidden.xml', 'python -m checks tests/checks tests/review > /logs/verifier/checks.json', ''].join('\n') },
      ...checks,
    ];
    case 'testing': return [
      { path: 'tests/test.sh', text: [...run, 'for mutant in tests/mutants/*.patch; do', '  python -m mutants run "$mutant" >> /logs/verifier/mutants.jsonl', 'done', ''].join('\n') },
      ...checks,
      ...MUTANT_DEFECTS.map((defect, index) => ({
        path: `tests/mutants/d${index + 1}.patch`, withheld: 'referenceAnswer' as const,
        text: `# ${defect.title}\n--- a/src/rules.py\n+++ b/src/rules.py\n@@ -${20 + index * 7},1 +${20 + index * 7},1 @@\n-${defect.from}\n+${defect.to}\n`,
      })),
    ];
    case 'ops':
    case 'rca': return [
      { path: 'tests/test.sh', text: [...run, 'python -m checks tests/checks tests/review --reference tests/ground_truth.json > /logs/verifier/checks.json', ''].join('\n') },
      ...checks,
      { path: 'tests/ground_truth.json', text: `${JSON.stringify(GROUND_TRUTH[kind], null, 2)}\n`, withheld: 'referenceAnswer' },
    ];
  }
}

const directoryCache = new Map<string, TaskFileRecord[]>();

/** Every file of a public task's Harbor directory, or nothing when the benchmark has no such task. */
export function taskFilesOf(benchmarkId: string, taskId: string): TaskFileRecord[] | undefined {
  const key = `${benchmarkId}.${taskId}`;
  const cached = directoryCache.get(key);
  if (cached) {
    return cached;
  }
  const task = taskOf(benchmarkId, taskId);
  if (!task) {
    return undefined;
  }
  const { kind } = benchmarkById(benchmarkId);
  const files: TaskFileRecord[] = [
    { path: 'instruction.md', text: `${task.statement}\n\n${INSTRUCTION_TAIL[kind]}\n\n${REPORT_SCHEMA[kind]}\n` },
    { path: 'task.toml', text: taskTomlOf(benchmarkId, task, kind) },
    ...environmentFilesOf(kind, moduleOf(task.id)),
    ...solutionFilesOf(kind, moduleOf(task.id)),
    ...testFilesOf(kind, task.id),
  ];
  directoryCache.set(key, files);
  return files;
}

/** Why everything under a directory is withheld, when every file there is withheld for the same reason. */
export function withheldUnder(files: TaskFileRecord[], directory: string): WithheldReason | undefined {
  const reasons = new Set(files.filter(file => file.path.startsWith(`${directory}/`)).map(file => file.withheld));
  const [reason] = reasons;
  return reasons.size === 1 ? reason : undefined;
}

/** A directory's entries, directories first and each group by name, or nothing when the task has no such directory. */
export function directoryEntriesOf(files: TaskFileRecord[], directory: string): TaskEntry[] | undefined {
  const prefix = directory === '' ? '' : `${directory}/`;
  const inside = files.filter(file => file.path.startsWith(prefix));
  if (inside.length === 0) {
    return undefined;
  }
  const entries = new Map<string, TaskEntry>();
  for (const file of inside) {
    const [name, ...rest] = file.path.slice(prefix.length).split('/');
    const path = `${prefix}${name}`;
    entries.set(path, rest.length > 0
      ? { path, kind: 'directory', withheld: withheldUnder(files, path) }
      : file.withheld ? { path, kind: 'file', withheld: file.withheld } : { path, kind: 'file', size: byteLengthOf(file.text) });
  }
  return [...entries.values()].sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === 'directory' ? -1 : 1));
}

/** A published file as the API serves it, its text cut where it passes the limit. */
export function taskFileOf(file: TaskFileRecord): TaskFile {
  const bytes = new TextEncoder().encode(file.text);
  const truncated = bytes.length > MAX_FILE_TEXT_BYTES;
  return {
    path: file.path, size: bytes.length, mediaType: mediaTypeOf(file.path),
    text: truncated ? new TextDecoder().decode(bytes.slice(0, MAX_FILE_TEXT_BYTES)) : file.text, truncated,
  };
}
