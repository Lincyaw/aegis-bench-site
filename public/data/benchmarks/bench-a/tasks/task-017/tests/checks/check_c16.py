"""C16 查询使用已有索引"""
import json


def check_c16(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("C16", report)
