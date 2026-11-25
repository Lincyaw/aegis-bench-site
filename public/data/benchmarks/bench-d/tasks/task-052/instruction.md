订单查询接口的延迟在十分钟内升高数倍，随后多个下游服务出现超时。请还原这次故障的传播链路。

请在工作目录写一份 report.json，按从源头到表象的顺序列出故障传播经过的服务。report.json 的格式如下：

{ "chain": [ { "service": string, "symptom": string } ] }
