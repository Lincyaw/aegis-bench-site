# 工作约定

- 动手之前先阅读 [工程规范](CONTRIBUTING.md) 和 [设计规范](src/ui/README.md)，并按其中的规则修改。
- 接口有变化时先改 `spec/`（入口是 `spec/main.tsp`）。mock 服务端只通过接口与站点交互，不引用站点代码；站点也不引用 mock。
- 提交前运行 `npm run check` 和 `npm run build`，再按工程规范中的验证步骤在浏览器里核对。
- 规范与代码不一致时，先讨论应该改哪一方，然后同时更新规范和代码。
