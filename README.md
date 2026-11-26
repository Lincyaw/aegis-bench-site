# Aegis Bench 前端 demo

Aegis Bench 的前端演示，包括对外站点和内部的评测中台。对外站点按 Figma 文件 [Aegis Bench](https://www.figma.com/design/tozbvKVPYuRZEWHUhoSthz) 中「01 · 对外站点」的设计实现；中台按「02 · 内部中台」的页面结构实现，并与对外站点共用一套设计系统。接口用 TypeSpec 声明；数据由浏览器中的 mock 服务端提供，它只实现接口声明的操作，读的是仓库里 `public/data/` 下的静态文件，因此不需要后端。

预览地址是 <https://profile.aoyangfang.top/aegis-bench-site/>。每次推送到 master，GitHub Actions 会重新构建并发布到 GitHub Pages（见 `.github/workflows/pages.yml`）；站点挂在仓库名的路径下，构建以这个路径为 base。mock 运行在 service worker 里，只能通过 HTTPS 访问。

## 运行

```bash
npm install
npm run dev      # 先由 TypeSpec 生成 OpenAPI 与前端类型，再启动开发服务器
npm run build    # 生产构建；mock 服务随构建一起发布
npm run check    # 类型检查、oxlint、样式检查、译文检查与数据检查
npm run mock     # 在本地启动 mock 服务：接口 http://127.0.0.1:4010/api，接口文档 http://127.0.0.1:4010/docs
```

## 规范

- [工程规范](CONTRIBUTING.md)：目录与依赖、接口先行与 mock、语言、内容、代码规则、检查与验证、提交。
- [设计规范](src/ui/README.md)：令牌、文字、颜色、控件、动效、焦点、主题与组件清单。`src/ui` 是一个独立的设计系统目录，可以整体复制到别的项目中参考。

## 结构

| 位置 | 内容 |
|---|---|
| `spec/main.tsp` | 接口入口与对外接口：环节、评测基准、排行榜、任务、运行、模型、语言 |
| `spec/console/` | 中台接口，按领域分文件：登录会话、汇总结果、任务、运行、模型、展示集、轨迹分析、发布、工作区、成员、设置、报告 |
| `spec/atif.tsp` | 运行轨迹的格式，ATIF-v1.8，按 Harbor 的参考模型（`harbor.models.trajectories`）声明 |
| `spec/data.tsp` | 数据目录里每种文件的格式，生成发布用的 JSON Schema 和 mock 的类型 |
| `src/` | 按业务领域组织的站点代码，各目录的职责见工程规范 |
| `content/` | 各评测基准的介绍页与研究报告（MD/MDX） |
| `public/data/` | mock 服务端读取的评测记录：评测基准、任务、运行、轨迹、轨迹分析与发布记录 |
| `scripts/` | 仓库自带的检查脚本（译文、数据）与本地 mock 服务 |

## 运行记录

每个评测基准有一个运行记录页：左栏任务，中栏各组合的 5 次运行，右栏是选中运行的详情。详情固定五个标签：给模型的输入、模型的输出、评分方式（含检查代码）、失败原因、执行轨迹。窄屏上逐层进入。

宽屏上可以从「浏览」切到「对照」，用来核对判分。选一次运行时，左边是最终回复、全部改动和整条轨迹（一页看全），右边是全部检查项，未通过的展开在前；选两到三次运行时按检查项逐行对齐，默认只看结果不同的检查。对照的运行写在地址里，可以直接分享。中台的运行详情页也能切到对照，只对照这一次运行。

## 评测中台

中台在 `/console`（英文 `/en/console`），整个中台都要登录，只有成员能登录。成员分三种角色：所有成员都能查看全部记录；编辑还能起草、发布和恢复版本；管理员还能管理成员和设置。页面只给出当前角色能做的操作，接口拒绝其余的。演示环境里成员的密码都是 `demo`，可以用 `lin.fang`（管理员）、`zhou.yu`（编辑）或 `he.ming`（只读）登录。中台汇集每个评测基准的全部记录：执行失败的运行列出但不计入结果，失败运行经复核分为模型错误、评分错误和任务缺陷。

设置里的对外联系邮箱由对外站点的首页和「关于我们」读取。

研究报告在中台起草、预览并复核，发布仍然是提交文件：草稿在浏览器里按构建时的同一套插件编译预览，勾完设置里的发布前检查后提交复核，达到设置要求的同意人数后，下载文件提交到 `content/reports/<目录名>/`，对外站点下次构建时显示。报告可以用 `<Replay run="…" />` 和 `<RunNumber run="…" field="steps" />` 引用运行。

对外站点只显示每个评测基准已发布的版本：排行榜上的组合、简介和运行示例。在中台起草下一版、发布后，对外站点即改为显示它；被替换的版本可以再次发布以恢复。演示环境里，中台对发布记录、成员和设置的修改都只保存在浏览器内存里，重新加载页面后回到初始状态：发布记录回到数据目录里记录的版本，成员和设置回到演示的初始值。

## 轨迹校验

mock 轨迹符合 ATIF-v1.8。可以把轨迹导出后用 Harbor 自带的校验器检查：

```bash
uv run python -m harbor.utils.trajectory_validator path/to/trajectory.json
```

## 数据

站点展示的评测记录都是静态文件：目录、索引和发布记录在 `public/data/` 下，运行详情、轨迹和任务文件也可以放在 Hugging Face 上（见下文）。构建把 `public/data/` 原样复制到站点的 `data/` 下；mock 服务端启动时读入目录和索引，运行详情、轨迹和任务文件在第一次被请求时才读取。现有数据是占位内容：评测基准、模型与数值都不是真实结果，规模也只有每个评测基准 4 到 8 道任务。

```
public/data/
  catalog.json                          环节、模型、框架，以及评测基准的目录名和顺序
  benchmarks/<评测基准>/
    benchmark.json                      名称、版本、所属环节、指标、时间线规则、评分规则
    tasks.json                          每道任务：说明、检查项、文件清单、版本历史、验证运行
    tasks/<任务>/…                      任务的 Harbor 目录，文件原样存放（放在 Hugging Face 时，这里只留不公开的文件）
    runs.json                           每次运行的索引：组合、结果、得分、步数、成本、复核分类、未通过的检查
    runs/<运行>/run.json                运行的其余记录：输入、输出、评分、失败原因与复核（或放在 Hugging Face）
    runs/<运行>/trajectory.json         运行轨迹，ATIF-v1.8（或放在 Hugging Face）
    hunts.json                          轨迹分析：每次分析的问题、维度、探针与逐条判定
    releases.json                       已发布的各个版本，其中一个是当前版本
```

### 数据格式

每种文件的格式在 `spec/data.tsp` 中声明，与接口共用同一套模型，例如运行的评分、输出和 ATIF 轨迹。`npm run gen` 由它生成两样东西：
- **JSON Schema**：`public/schema/data-files.json`，随站点发布在 `<站点>/schema/data-files.json`，供准备数据的人和工具使用。每种文件是其中 `$id` 为 `<模型名>.json` 的一份 schema，例如 `RunFile.json`。
- **mock 的类型**：mock 读文件时用的类型由它生成，不另写一份。

`npm run check:data` 按 schema 检查数据目录里的每个文件，再检查文件之间的引用：运行指向的任务、模型和框架是否存在，未通过的检查是否属于这道任务，轨迹的步数是否与索引一致，任务文件的大小是否与清单一致，轨迹分析和发布记录引用的运行是否存在，是否恰好有一个当前版本。它是 `npm run check` 的一部分。
- `npm run check:data -- <目录>` 检查另一个按同样结构组织的数据目录，适合在放进仓库或上传到 Hugging Face 之前先检查。
- 加上 `--hugging-face` 时，放在 Hugging Face 上的文件也逐个下载检查。遇到限流会按 `Retry-After` 等待后继续，所以可能要几分钟。

接入真实数据时注意：
- **只记录事实，汇总由服务端计算。** 排行榜的分数和成本是各组合计入运行的 `score` 与 `costUsd` 的均值，任务数、通过率、各类计数也都从 `runs.json` 和 `tasks.json` 算出，不另存汇总值。一次运行的记录分在 `runs.json` 的一项和它的 `run.json` 里，同一个字段只出现在一处。
- **文件全部公开。** 仓库是公开的，`public/` 下的文件发布后任何人都能直接下载，包括中台才显示的参考解法、参考答案和复核结论。不能公开的数据不要放进来。
- **控制体积。** GitHub 拒收超过 100 MiB 的单个文件，Pages 站点总共不超过 1 GB。现有占位数据在仓库里约 5 MB，放在 Hugging Face 上的约 25 MB。
- **先检查再发布。** mock 读文件时不逐项校验，格式由 `npm run check:data` 把关；`npm run dev` 和 `npm run mock` 另外按接口检查每个响应，数据有误时相应的请求返回 500 并写明哪一项不合规。

### 放在 Hugging Face 上的记录

评测基准的 `benchmark.json` 写明 `huggingFace`（数据集仓库、提交号、仓库内的目录）时，它的 `runs/` 和 `tasks/` 按同样的结构放在那个目录下，不在 `public/data/` 里。读者打开某次运行或某个任务文件时，浏览器才从 Hugging Face 取那一个文件。运行详情和任务文件页会注明记录存放在 Hugging Face，并链接到对应的目录。
- 用提交号而不是分支名，记录就固定在那个版本，链接也不会随仓库更新而变。更新数据时上传新的提交，再改 `benchmark.json` 里的提交号。
- 参考解法和参考答案这类不公开的文件不上传，仍留在 `public/data/` 的任务目录里，只供中台读取。
- 数据集仓库必须公开：静态站点里放不了访问令牌，私有或受限的仓库读不到。
- 读者访问不了 huggingface.co 时，接口对需要这些记录的请求返回 502，并给出记录在 Hugging Face 上的页面。页面在原本显示记录的位置说明读取不到，并给出链接；评测基准页和运行记录页的其余部分照常显示。匿名访问时，每个 IP 每 5 分钟最多下载 3,000 个文件。
- 现在 Bench A、B、C 的运行与任务文件放在 [PolarBear2026/agent-eval-demo](https://huggingface.co/datasets/PolarBear2026/agent-eval-demo)，Bench D 全部在仓库里。
