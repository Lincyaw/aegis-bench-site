"""O1 节点顺序与参考链路一致"""
import json


def check_o1(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("O1", report)
