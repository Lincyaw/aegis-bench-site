"""C08 数据库迁移可回滚"""
import json


def check_c08(workspace, reference):
    report = json.loads((workspace / "report.json").read_text())
    return reference.matches("C08", report)
