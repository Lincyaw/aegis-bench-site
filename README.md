# Aegis Bench 对外站点 demo

Aegis Bench 对外站点的前端演示。页面按 Figma 文件 [Aegis Bench](https://www.figma.com/design/tozbvKVPYuRZEWHUhoSthz) 中「01 · 对外站点」的设计实现。接口用 TypeSpec 声明，数据由浏览器里的 mock 服务提供，不需要后端。

## 运行

```bash
npm install
npm run dev      # 先由 TypeSpec 生成 OpenAPI 与前端类型，再启动开发服务器
npm run build    # 生产构建；mock 服务随构建一起发布
```

## 结构

代码按业务领域分目录，每个目录放该领域的页面、组件、样式和展示规则。

| 位置 | 内容 |
|---|---|
| `spec/main.tsp` | 对外接口：环节、评测基准、排行榜、任务、运行、模型 |
| `spec/atif.tsp` | 运行轨迹的格式，ATIF-v1.8，按 Harbor 的参考模型（`harbor.models.trajectories`）声明 |
| `generated/openapi.yaml`、`src/api/schema.ts` | 由 `npm run gen` 从 spec 生成，不入库 |
| `src/api/client.ts` | 类型化的请求客户端与数据查询；请求带 `Accept-Language`，名称由接口按语言返回 |
| `src/mocks/` | MSW mock，处理函数按 spec 的路径、参数与响应体类型检查（openapi-msw）；任务、运行与轨迹按编号确定性生成 |
| `src/site/`、`src/ui/` | 站点框架（导航、页脚、站点地图、主题）与通用控件 |
| `src/i18n/` | 中英文案（`zh.ts` 定义结构，`en.ts` 按同一结构类型检查）与语言路由：中文在根路径，英文在 `/en` |
| `src/articles/`、`content/` | MD/MDX 文档的编译与自定义块；`content/` 下是各评测基准的介绍页与研究报告 |
| `src/landing/` | ∞ 首页：React 渲染页面，`landingMotion.ts` 驱动滚动叙事、three.js 循环与各环节的小动画 |
| `src/benchmarks/`、`src/leaderboard/`、`src/runs/`、`src/models/`、`src/reports/`、`src/lifecycle/` | 各业务页面 |
| `src/styles/tokens.css` | 从 Figma 变量 `Aegis · 颜色`、`Aegis · 尺寸` 导出的设计 token；动效与组合值在 `base.css` |

## 编写文档

评测基准介绍页是 `content/benchmarks/<评测基准 id>/<语言>.mdx`，研究报告是 `content/reports/<slug>/<语言>.md` 或 `.mdx`，报告的 frontmatter 写 `title`、`date`、`summary`、`models`、`benchmarks`。`##` 标题会成为页面的分区导航。MDX 里可以直接使用这些块：`Flow`/`Step`、`Sample`、`Facts`/`Fact`、`Versions`/`Version`、`Faq`/`Question`、`Citation`、`Callout`；评测基准页另有 `Leaderboard`（`top` 指定名次数）和 `RecentRuns`，内容取自接口。

## 运行记录

每个评测基准有一个运行记录页：左栏任务，中栏各组合的 5 次运行，右栏是选中运行的详情。详情固定五个标签：给模型的输入、模型的输出、评分方式（含检查代码）、失败原因、执行轨迹。窄屏上逐层进入。

## 轨迹校验

mock 轨迹符合 ATIF-v1.8。可以把轨迹导出后用 Harbor 自带的校验器检查：

```bash
uv run python -m harbor.utils.trajectory_validator path/to/trajectory.json
```

## 数据

评测基准、模型与数值都是占位内容。
