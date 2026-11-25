import pytest


@pytest.mark.parametrize("case", load_cases("orders"))
def test_orders_rules(case):
    assert apply_rules(case.cart, case.rules).total == case.expected
