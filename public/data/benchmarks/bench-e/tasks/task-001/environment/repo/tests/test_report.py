from ledger.io.reader import parse_line
from ledger.report.summary import summarize
from ledger.report.table import render_table


def test_summarize():
    entries = [parse_line("2026-11-02 food -12.50"), parse_line("2026-11-03 food -7.50"), parse_line("2026-11-03 salary 3000")]
    assert summarize(entries) == {"food": -2000, "salary": 300000}


def test_render_table():
    assert render_table({"food": -2000}) == "food       -20.00\ntotal      -20.00"
