为优惠券叠加规则的修改编写测试，覆盖满减与折扣同时生效、超过上限与使用过期券三种情形。

新增的测试放在 tests/ 目录下，完成后在仓库根目录写一份 report.json，说明每个测试覆盖的情形。report.json 的格式如下：

{ "tests": [ { "path": string, "covers": string } ] }
