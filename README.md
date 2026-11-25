# Aegis Bench 前端 demo

Aegis Bench 的前端演示，包括对外站点和内部的评测中台。对外站点按 Figma 文件 [Aegis Bench](https://www.figma.com/design/tozbvKVPYuRZEWHUhoSthz) 中「01 · 对外站点」的设计实现；中台按「02 · 内部中台」的页面结构实现，并与对外站点共用一套设计系统。接口用 TypeSpec 声明；数据由浏览器中的 mock 服务端提供，它只实现接口声明的操作，因此不需要后端。

## 运行

```bash
npm install
npm run dev      # 先由 TypeSpec 生成 OpenAPI 与前端类型，再启动开发服务器
npm run build    # 生产构建；mock 服务随构建一起发布
npm run check    # 类型检查、oxlint、样式检查与译文检查
npm run mock     # 在本地启动 mock 服务：接口 http://127.0.0.1:4010/api，接口文档 http://127.0.0.1:4010/docs
```

## 规范

- [工程规范](CONTRIBUTING.md)：目录与依赖、接口先行与 mock、语言、内容、代码规则、检查与验证、提交。
- [设计规范](src/ui/README.md)：令牌、文字、颜色、控件、动效、焦点、主题与组件清单。`src/ui` 是一个独立的设计系统目录，可以整体复制到别的项目中参考。

## 结构

| 位置 | 内容 |
|---|---|
| `spec/main.tsp` | 接口入口与对外接口：环节、评测基准、排行榜、任务、运行、模型、语言 |
| `spec/console/` | 中台接口，按领域分文件：登录会话、汇总结果、任务、运行、模型、展示集、轨迹分析 |
| `spec/atif.tsp` | 运行轨迹的格式，ATIF-v1.8，按 Harbor 的参考模型（`harbor.models.trajectories`）声明 |
| `src/` | 按业务领域组织的站点代码，各目录的职责见工程规范 |
| `content/` | 各评测基准的介绍页与研究报告（MD/MDX） |
| `scripts/` | 仓库自带的检查脚本 |

## 运行记录

每个评测基准有一个运行记录页：左栏任务，中栏各组合的 5 次运行，右栏是选中运行的详情。详情固定五个标签：给模型的输入、模型的输出、评分方式（含检查代码）、失败原因、执行轨迹。窄屏上逐层进入。

## 评测中台

中台在 `/console`（英文 `/en/console`），整个中台都要登录。演示环境里任意账号都能登录，密码是 `aegis`；账号由字母、数字、点、下划线或连字符组成。中台汇集每个评测基准的全部记录：执行失败的运行列出但不计入结果，失败运行经复核分为模型错误、评分错误和任务缺陷。

## 轨迹校验

mock 轨迹符合 ATIF-v1.8。可以把轨迹导出后用 Harbor 自带的校验器检查：

```bash
uv run python -m harbor.utils.trajectory_validator path/to/trajectory.json
```

## 数据

评测基准、模型与数值都是占位内容。
