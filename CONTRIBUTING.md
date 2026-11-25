# 工程规范

本文规定在本仓库中如何组织代码、设计接口、处理语言与内容，以及提交前怎样检查和验证。视觉与组件规范见 [`src/ui/README.md`](src/ui/README.md)。标注“检查”的规则由 `npm run check` 强制执行。

## 目录与依赖

代码按业务领域分目录，每个领域目录放该领域的页面、组件、样式和展示规则：

| 目录 | 职责 |
|---|---|
| `src/benchmarks`、`src/leaderboard`、`src/runs`、`src/tasks`、`src/models`、`src/results`、`src/collections`、`src/analysis`、`src/releases`、`src/workspace`、`src/members`、`src/settings`、`src/reports`、`src/lifecycle`、`src/landing` | 各业务领域；对外站点与中台的页面都按领域放在这里 |
| `src/ui` | 设计系统：令牌、全局样式、通用组件，不依赖任何业务领域 |
| `src/site` | 对外站点框架：导航、页脚、站点地图（所有路径）、主题切换 |
| `src/console` | 中台框架：顶栏、侧栏、登录、中台的路径 |
| `src/i18n` | 语言路由与界面文案 |
| `src/articles`、`content` | MD/MDX 文档的编译、自定义块和正文 |
| `src/api` | 由 spec 生成的 OpenAPI 文档与类型、模型类型（`types.ts`）、接口路径（`server.ts`）、请求客户端（对外站点 `client.ts`，中台 `consoleClient.ts`） |
| `src/mocks` | mock 服务端，实现接口声明的全部操作；数据目录的格式与读取在 `records.ts` |
| `public/data` | mock 服务端读取的评测记录，随站点原样发布 |

依赖方向：
- 业务领域可以依赖 `ui`、`site`、`console`、`i18n`、`api`、`articles`。
- 领域之间可以使用对方导出的组件和展示规则（例如 `models` 的 `ModelLink`），但不使用对方的页面。
- 站点的任何代码都不得引用 `src/mocks`，入口文件启动 mock 服务除外。（检查）
- `src/mocks` 只能引用 `src/api` 生成的类型和它自己的模块。（检查）

## 接口先行

接口以 `spec/`（TypeSpec）为唯一来源。`spec/main.tsp` 是入口，声明对外站点的接口，并引入 `spec/console/` 下按领域划分的中台接口：
1. 修改接口时先改 spec，再运行 `npm run gen`（`dev`、`build` 和 `mock` 会自动运行）。它会生成 OpenAPI 文档 `src/api/openapi.json` 和类型 `src/api/schema.ts`，两者都不入库。
2. 前端只通过 `src/api/client.ts`（对外站点）和 `src/api/consoleClient.ts`（中台）的查询函数取数据。查询函数基于 `openapi-fetch`，路径、参数和响应体都按 spec 做类型检查。模型类型在 `src/api/types.ts`，站点和 mock 共用；接口挂载的路径取自 spec 的 `@server`。
3. 闭集合（视图、运行结果、时间线标记、语言等）在 spec 中声明为枚举，前端使用生成的 `*Values` 数组，不再另写一份。
4. 对外站点的接口无需登录。中台的接口都在 `/console` 下：登录后由会话 cookie 维持身份，没有会话的请求一律返回 401，中台页面随即转到登录页，登录后回到原页面。
5. mock 读取的数据文件也以 spec 为准：`spec/data.tsp` 声明每种文件的格式，并复用接口的模型。`npm run gen` 由它生成发布用的 JSON Schema `public/schema/data-files.json`（不入库），文件的类型随 `src/api/schema.ts` 一起生成，在 `src/api/types.ts` 中命名。改数据格式时先改 `spec/data.tsp`，再用 `npm run check:data` 检查现有数据。

### mock 只通过接口交互

mock 服务端的作用除了提供演示数据，还在于检验接口设计是否合理：
- **只在接口层交互**：站点与 mock 之间只走 HTTP 请求。mock 运行在 Service Worker 中，站点的请求和对接真实服务端时完全一样。
- **处理函数受 spec 约束**：处理函数用 `openapi-msw` 按 spec 类型编写，返回 spec 未声明的路径、参数、状态码或响应体都无法通过编译。
- **业务规则在服务端**：例如时间线上每一步的标记由服务端判定，前端只负责显示；同一条规则不在两端各写一遍。
- **缺口回到 spec**：前端需要但接口不提供的数据，先补进 spec，再由 mock 实现，不让前端从别的数据里自行推算。
- **运行时契约**：本地开发（`npm run dev`）和本地 mock 服务（`npm run mock`）中，`src/mocks/contract.ts` 是 mock 的唯一入口。线上发布的构建不做这项检查，校验库也不打进发布包。它用 openapi-backend 按 OpenAPI 文档检查每一次交互：
  - 请求不合 spec 时返回 400；
  - 访问 spec 未声明的操作时返回 404；
  - mock 自己的响应不合 spec 时返回 500，包括响应体、日期等格式和响应头。

  这三种错误都会写明是哪个操作、哪一项不合规。站点里一旦出现这类错误，就说明接口或 mock 有问题，要先查清原因再改。
- **数据来自数据目录**：mock 只读 `public/data/` 下的文件，以及评测基准写明放在 Hugging Face 上的运行与任务文件，不生成数据。浏览器里按站点的 base 取数据目录的文件，`npm run mock` 从磁盘读取；Hugging Face 上的文件两者都按 URL 请求。文件只记录评测产生的事实；排行榜、通过率、各类计数这些汇总都由 mock 从中计算，不另存一份。目录结构见 README 的「数据」一节。

### 直接调用接口

`npm run mock` 会在本地启动同一套 mock：同样的处理函数、同样的契约检查。
- 接口地址：`http://127.0.0.1:4010/api`，可以用 curl 直接调用。
- 接口文档：`http://127.0.0.1:4010/docs`，可以在页面上逐个操作试用。
- OpenAPI 文档：`http://127.0.0.1:4010/openapi.json`。

设计接口时，先用它把新操作调用一遍，确认请求、响应和错误都符合预期，再写前端。

## 语言

- 中文页面在根路径，英文页面在 `/en`。站内链接和跳转一律通过 `LocaleLink`、`LocaleNavLink` 和 `useLocalizedNavigate`，保持读者当前的语言。
- 站点支持的语言就是 spec 中 `Locale` 枚举声明的语言。新增语言时先改 spec，类型检查会列出所有需要补齐的地方。
- 界面文案放在 `src/i18n/zh.ts` 和 `en.ts`，中台的文案放在 `console.zh.ts` 和 `console.en.ts`，由前两者引入。中文文件决定文案结构，英文文件必须与之结构相同（检查）；表示数量的文案用 `_one` 和 `_other` 两个键。
- 中文文案不得与英文相同；确实应当相同的条目连同理由列入 `scripts/check-locale.ts` 的允许表。（检查）
- 名称、简介、标签由接口按 `Accept-Language` 返回对应语言；评测记录（任务原文、轨迹、检查项标题、复核结论）保持产生时的语言。
  - `Accept-Language` 按 HTTP 标准协商，例如 `en-US,en;q=0.9`；
  - 服务端在 `Locale` 中选最匹配的语言，都不匹配时用 zh-CN；
  - 响应用 `Content-Language` 标明实际使用的语言。

## 内容

- 评测基准介绍页放在 `content/benchmarks/<评测基准 id>/<语言>.mdx`，研究报告放在 `content/reports/<slug>/<语言>.md` 或 `.mdx`。
- 报告的 frontmatter 包含 `title`、`date`、`summary`、`models`、`benchmarks`，由 zod 在加载时校验。
- `##` 标题会成为页面的分区导航。站内链接写成以 `/` 开头的路径，会自动保持当前语言。
- 可以直接使用的块：`Flow`/`Step`、`Sample`、`Facts`/`Fact`、`Versions`/`Version`、`Faq`/`Question`、`Citation`、`Callout`。评测基准页另有 `Leaderboard` 和 `RecentRuns`，数据取自接口。

## 代码规则

- **一个文件一个概念**，文件名和函数名直接说明用途。文件超过约 400 行、函数超过约 50 行时，检查能否沿自然边界拆分；但不为凑行数拆开本属一体的内容。
- **不写私有辅助函数**：只有一处调用的就内联；多处调用的给出有含义的名字并导出。只转发参数的包装函数一律内联。
- **命名常量**：有含义的字面量用命名常量；路径一律由 `src/site/siteMap.ts` 的常量和函数生成；闭集合只定义一次。
- **不用布尔参数切换函数的行为**，需要两种行为时写两个函数。
- **快速失败**：
  - 不吞异常，不设兜底值；
  - 类型收窄用 `instanceof` 或判空，不满足就抛错；
  - 不用非空断言 `!`（检查）；
  - `switch` 必须覆盖所有情况（检查）。
- **组件只负责呈现**：数据由页面用 `useSuspenseQuery` 取得，再传给组件。
- **命令式代码与 React 的分工**：three.js、anime.js 这类命令式代码不直接写 DOM 结构。React 渲染全部元素；命令式代码通过 `data-part` 约定取得元素（见 `src/landing/landingMarkup.ts`）。
- **库优先**：有成熟库的就用库（Radix、i18next、MDX、zod、openapi-fetch、openapi-msw），不自己手写解析器。
- **注释**只写代码表达不了的意图，用英文书写，不记录修改经过。

## 检查与验证

`npm run check` 包含以下几项：
- 类型检查；
- oxlint：带类型信息运行，警告也视为失败；
- Stylelint：见设计规范；
- 中文文案检查；
- 数据检查：数据目录的文件按 `spec/data.tsp` 的格式和彼此的引用检查，放在 Hugging Face 上的文件另用 `npm run check:data -- --hugging-face` 检查。

提交前它和 `npm run build` 都必须通过。

功能改动还要在浏览器中验证：
1. 运行 `npm run build`，再用 `npx vite preview` 打开生产构建。
2. 按“中文和英文 × 深色和浅色 × 1440 和 390 宽度”的组合查看改动涉及的页面。
3. 确认控制台没有报错，页面没有横向滚动，交互结果符合预期。

## 设计稿

- 颜色、圆角、间距先在 Figma 文件 `Aegis Bench` 的变量中修改，再同步到 `src/ui/tokens.css`。
- 新的视觉样式也要画进 Figma。
- Figma 中使用占位名称，不出现真实评测基准的名称。

## 提交

- 小步提交，每次只包含一项独立的改动，并且这次提交本身能通过检查和构建。
- 提交信息的标题用一句话说明做了什么，正文说明为什么这样做。
- 只暂存自己改动的文件。
