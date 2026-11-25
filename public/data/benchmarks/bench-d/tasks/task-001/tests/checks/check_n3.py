"""N3 链路节点 3 被召回"""
import json


def check_n3(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("N3", report)
