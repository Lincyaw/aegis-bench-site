"""S1 测试在正确版本上全部通过"""
import json


def check_s1(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("S1", report)
