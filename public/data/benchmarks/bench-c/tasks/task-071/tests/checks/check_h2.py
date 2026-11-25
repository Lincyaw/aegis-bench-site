"""H2 关键接口错误率恢复到基线"""
import json


def check_h2(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("H2", report)
