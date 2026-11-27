from datetime import date

from ledger.io.reader import parse_line


def test_parse_line():
    entry = parse_line("2026-11-02 food -12.50 lunch")
    assert (entry.day, entry.account, entry.cents, entry.note) == (date(2026, 11, 2), "food", -1250, "lunch")


def test_parse_line_without_note():
    assert parse_line("2026-11-03 salary 3000").note == ""
