"""Amounts are kept in cents; these turn them to and from text."""


def parse_amount(text):
    """Reads an amount such as -12.50 into cents."""
    sign = -1 if text.startswith("-") else 1
    whole, _, fraction = text.lstrip("+-").partition(".")
    return sign * (int(whole) * 100 + int(fraction.ljust(2, "0")[:2]))


def format_amount(cents):
    """Writes cents as an amount with two decimals, such as -12.50."""
    sign = "-" if cents < 0 else ""
    return f"{sign}{abs(cents) // 100}.{abs(cents) % 100:02d}"
