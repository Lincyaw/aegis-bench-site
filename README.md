# Aegis Bench 对外站点 demo

Aegis Bench 对外站点的前端演示。页面按 Figma 文件 [Aegis Bench](https://www.figma.com/design/tozbvKVPYuRZEWHUhoSthz) 中「01 · 对外站点」的设计实现。接口用 TypeSpec 声明，数据由浏览器里的 mock 服务提供，不需要后端。

## 运行

```bash
npm install
npm run dev      # 先由 TypeSpec 生成 OpenAPI 与前端类型，再启动开发服务器
npm run build    # 生产构建；mock 服务随构建一起发布
```

## 结构

| 位置 | 内容 |
|---|---|
| `spec/main.tsp` | 对外接口：环节、评测基准、排行榜、任务、运行、模型 |
| `spec/atif.tsp` | 运行轨迹的格式，ATIF-v1.8，按 Harbor 的参考模型（`harbor.models.trajectories`）声明 |
| `generated/openapi.yaml`、`src/api/schema.d.ts` | 由 `npm run gen` 从 spec 生成，不入库 |
| `src/api/client.ts` | 类型化的请求客户端与数据查询 |
| `src/mocks/` | MSW mock：目录数据照搬设计稿文案；任务、运行与轨迹按编号确定性生成，每次加载都相同 |
| `src/pages/`、`src/components/` | 评测基准、评测基准详情、排行榜、运行记录、模型页面 |
| `src/landing/` | ∞ 首页，由设计原型移植 |
| `src/styles/tokens.css` | 从 Figma 变量 `Aegis · 颜色`、`Aegis · 尺寸` 导出的设计 token |

## 运行记录

每个评测基准有一个运行记录页：左栏任务，中栏各组合的 5 次运行，右栏是选中运行的详情。详情固定五个标签：给模型的输入、模型的输出、评分方式（含检查代码）、失败原因、执行轨迹。窄屏上逐层进入。

## 轨迹校验

mock 轨迹符合 ATIF-v1.8。可以把轨迹导出后用 Harbor 自带的校验器检查：

```bash
uv run python -m harbor.utils.trajectory_validator path/to/trajectory.json
```

## 数据

评测基准、模型与数值都是占位内容。
