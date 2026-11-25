"""N5 链路节点 5 被召回"""
import json


def check_n5(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("N5", report)
