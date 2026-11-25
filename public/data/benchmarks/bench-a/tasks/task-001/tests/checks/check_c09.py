"""C09 report.json 格式正确"""
import json


def check_c09(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("C09", report)
