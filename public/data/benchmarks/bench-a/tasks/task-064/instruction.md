为服务新增「导出任务重试」相关的功能。已有接口的行为与返回格式保持不变。

完成后请运行项目已有的测试，并在仓库根目录写一份 report.json，列出改动的文件和每处改动的理由。report.json 的格式如下：

{ "files": [ { "path": string, "reason": string } ], "tests_run": boolean }
