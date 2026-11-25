支付回调在高峰时段大量超时，部分订单的状态长时间停留在「处理中」。请定位原因并恢复服务。

处置完成后，在工作目录写一份 report.json，给出根因结论、执行过的处置操作以及服务是否已恢复。report.json 的格式如下：

{ "root_cause": string, "actions": [ string ], "recovered": boolean }
