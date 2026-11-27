为 ledger 的 report 命令增加 JSON 输出：传入 --format json 时，以 JSON 对象输出各账户的合计与总计，金额保留两位小数并写成字符串；不传或传入 --format table 时，输出保持现在的表格不变。

完成后请运行项目已有的测试，并在仓库根目录写一份 report.json，列出改动的文件和每处改动的理由。report.json 的格式如下：

{ "files": [ { "path": string, "reason": string } ], "tests_run": boolean }
