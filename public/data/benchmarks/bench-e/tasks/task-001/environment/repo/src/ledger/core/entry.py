"""One line of a ledger: when, which account, how much."""
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Entry:
    day: date
    account: str
    cents: int
    note: str = ""

    def is_credit(self):
        return self.cents > 0
