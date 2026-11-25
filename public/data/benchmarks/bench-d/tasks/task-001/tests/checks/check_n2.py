"""N2 链路节点 2 被召回"""
import json


def check_n2(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("N2", report)
