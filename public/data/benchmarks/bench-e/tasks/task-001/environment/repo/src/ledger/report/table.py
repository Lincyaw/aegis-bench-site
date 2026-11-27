"""Renders a summary as a plain-text table."""
from ledger.core.money import format_amount


def render_table(summary):
    """One row per account, amounts right-aligned, and a total row."""
    width = max([len(account) for account in summary] + [len("total")])
    rows = [f"{account:<{width}}  {format_amount(cents):>10}" for account, cents in summary.items()]
    rows.append(f"{'total':<{width}}  {format_amount(sum(summary.values())):>10}")
    return "\n".join(rows)
