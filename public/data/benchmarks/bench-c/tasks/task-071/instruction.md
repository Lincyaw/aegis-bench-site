线上出现「证书过期」相关的故障现象，部分请求失败或超时。请定位原因并恢复服务。

处置完成后，在工作目录写一份 report.json，给出根因结论、执行过的处置操作以及服务是否已恢复。report.json 的格式如下：

{ "root_cause": string, "actions": [ string ], "recovered": boolean }
