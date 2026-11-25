"""N4 链路节点 4 被召回"""
import json


def check_n4(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("N4", report)
