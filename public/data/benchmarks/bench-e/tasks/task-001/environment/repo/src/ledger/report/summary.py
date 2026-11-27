"""Sums a ledger's entries by account."""
from collections import defaultdict


def summarize(entries):
    """Each account's total in cents, accounts in alphabetical order."""
    totals = defaultdict(int)
    for entry in entries:
        totals[entry.account] += entry.cents
    return dict(sorted(totals.items()))
