/** The console's Chinese text; its shape is every language's shape for the console. Keys with _one and _other take a count. */
export const consoleZh = {
  name: '评测中台',
  home: '评测中台首页',
  mainNav: '中台导航',
  openMenu: '打开中台导航',
  publicSite: '对外站点',
  context: '评测基准',
  nav: {
    overview: '概览',
  },
  account: {
    menu: '账户 {{account}}',
    signedInAs: '当前账户',
    signOut: '退出登录',
  },
  signIn: {
    title: '登录评测中台',
    lead: '评测中台汇集各评测基准的全部记录，仅供内部人员使用。',
    account: '账号',
    accountHint: '由字母、数字、点、下划线或连字符组成，例如 lin.fang',
    password: '密码',
    submit: '登录',
    failed: '账号或密码不正确。',
    demo: '演示环境：任意账号均可登录，密码为 {{password}}。',
  },
  error: {
    title: '页面无法显示',
    notFound: '没有找到这个地址对应的页面。',
    toConsole: '返回中台首页',
  },
  overview: {
    title: '概览',
    stats: {
      tasks: '任务',
      counted: '计入运行',
      countedNote_one: '另有 {{count, number}} 次执行失败未计入',
      countedNote_other: '另有 {{count, number}} 次执行失败未计入',
      passRate: '平均通过率',
      passRateNote: '计入运行中通过的比例',
      unreviewed: '待复核',
      unreviewedNote: '尚未复核的失败运行',
    },
    entrants: '各组合的结果',
    entrantsNote: '执行失败的运行不计入通过率与平均值。',
    column: {
      entrant: '模型 · 框架',
      passRate: '通过率',
      everyTime: '每次都通过',
      once: '至少一次通过',
      cost: '平均花费',
      steps: '平均步数',
    },
    tasksOf: '{{solved, number}} / {{total, number}}',
    recentFailures: '最近失败',
    pending: '待处理',
    pendingKind: {
      unreviewedFailures: {
        title_one: '{{count, number}} 次失败运行待复核',
        title_other: '{{count, number}} 次失败运行待复核',
        body: '复核给出失败原因的类别；失败类型的统计只计入复核过的运行。',
      },
      executionFailures: {
        title_one: '{{count, number}} 次运行因执行环境失败未计入',
        title_other: '{{count, number}} 次运行因执行环境失败未计入',
        body: '重新运行后才计入结果。',
      },
      gradingErrors: {
        title_one: '{{count, number}} 次失败经复核为评分错误',
        title_other: '{{count, number}} 次失败经复核为评分错误',
        body: '需要修订评分，并对这些运行重新评分。',
      },
    },
  },
  failureClass: {
    modelError: '模型错误',
    gradingError: '评分错误',
    constructionProblem: '任务缺陷',
    unreviewed: '未复核',
  },
};

export type ConsoleMessages = typeof consoleZh;
