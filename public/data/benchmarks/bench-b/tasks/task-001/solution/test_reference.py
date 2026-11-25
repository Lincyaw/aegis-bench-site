import pytest


@pytest.mark.parametrize("case", load_cases("notifications"))
def test_notifications_rules(case):
    assert apply_rules(case.cart, case.rules).total == case.expected
