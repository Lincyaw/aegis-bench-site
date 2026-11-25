"""H1 服务健康检查通过"""
import json


def check_h1(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("H1", report)
