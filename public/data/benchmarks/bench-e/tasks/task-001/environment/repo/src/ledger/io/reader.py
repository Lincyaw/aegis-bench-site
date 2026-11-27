"""Reads a ledger file: one entry per line, blank lines and # comments skipped."""
from datetime import date

from ledger.core.entry import Entry
from ledger.core.money import parse_amount


def parse_line(line):
    """Reads a line such as `2026-11-02 food -12.50 lunch` into an entry."""
    day, account, amount, *note = line.split()
    return Entry(date.fromisoformat(day), account, parse_amount(amount), " ".join(note))


def read_entries(path, since=None):
    entries = []
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            entry = parse_line(line)
            if since is None or entry.day >= date.fromisoformat(since):
                entries.append(entry)
    return entries
