"""N1 链路节点 1 被召回"""
import json


def check_n1(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("N1", report)
