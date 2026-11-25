「数据库连接耗尽」期间多个服务出现异常。请还原这次故障的传播链路。

请在工作目录写一份 report.json，按从源头到表象的顺序列出故障传播经过的服务。report.json 的格式如下：

{ "chain": [ { "service": string, "symptom": string } ] }
