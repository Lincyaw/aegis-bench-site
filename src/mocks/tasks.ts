import { benchmarkById, type TaskKind } from './benchmarks';
import { hashOf } from './hash';

/** The page size the task list answers with when the request names none, as the API declares. */
export const DEFAULT_TASK_PAGE_SIZE = 14;

export interface TaskRecord {
  id: string;
  title: string;

  /** The user's question as the task text gives it */
  statement: string;

  /** Labels the task's authors gave it, for choosing tasks to compare models on */
  tags: string[];
}

const TAG_POOL: Record<TaskKind, string[]> = {
  coding: ['接口', '数据', '并发', '配置', '鉴权', '迁移'],
  testing: ['规则', '金额', '并发', '边界'],
  ops: ['容量', '配置', '依赖', '网络'],
  rca: ['数据库', '缓存', '消息', '网关'],
};

/** One or two tags from the kind's pool, drawn from the task id. */
export function tagsOf(kind: TaskKind, taskId: string): string[] {
  const pool = TAG_POOL[kind];
  const first = hashOf(`tag:${taskId}`) % pool.length;
  const second = hashOf(`tag2:${taskId}`) % pool.length;
  return second === first || hashOf(`tags:${taskId}`) % 3 > 0 ? [pool[first]] : [pool[first], pool[second]];
}

const TITLE_POOL: Record<TaskKind, string[]> = {
  coding: ['批量导入去重', '接口限流配置', '订单状态机补全', '软删除恢复', '分片上传合并', '时区换算修正', '幂等键校验', '审计日志补全', '密码策略更新', '报表导出分批', '通知模板渲染', '多租户隔离', '重试退避策略', '配置项校验', '数据迁移脚本', '会话过期处理'],
  testing: ['积分过期规则', '运费计算', '库存预占回滚', '退款金额拆分', '会员等级升级', '订单合并发货', '价格舍入', '发票抬头校验', '秒杀限购', '地址解析', '优惠码大小写', '汇率换算'],
  ops: ['磁盘写满', '配置下发错误', 'DNS 解析失败', '线程池耗尽', '慢查询拖垮主库', '限流阈值过低', '依赖降级失效', '内存泄漏', '消息重复消费', '节点时钟漂移', '证书链缺失', '缓存击穿'],
  rca: ['支付链路超时', '登录服务抖动', '搜索延迟升高', '推荐服务雪崩', '网关错误率上升', '库存服务超时', '报表任务积压', '对象存储读取缓慢', '注册服务失败', '配置中心不可用'],
};

function statementOf(kind: TaskKind, title: string): string {
  switch (kind) {
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
  const { taskCount, kind, namedTasks, sample } = benchmarkById(benchmarkId);
  const named = namedTasks.map(([id, title]) => ({ id, title }));
  const namedIds = new Set(named.map(task => task.id));
  const pool = TITLE_POOL[kind];
  const generated: { id: string; title: string }[] = [];
  for (let number = 1; named.length + generated.length < taskCount; number++) {
    const id = `task-${String(number).padStart(3, '0')}`;
    if (!namedIds.has(id)) {
      generated.push({ id, title: pool[generated.length % pool.length] });
    }
  }
  const tasks = [...named, ...generated].map(task => ({
    ...task, statement: task.id === sample.taskId ? sample.statement : statementOf(kind, task.title), tags: tagsOf(kind, task.id),
  }));
  taskCache.set(benchmarkId, tasks);
  return tasks;
}

export function taskOf(benchmarkId: string, taskId: string): TaskRecord | undefined {
  return tasksOf(benchmarkId).find(task => task.id === taskId);
}
