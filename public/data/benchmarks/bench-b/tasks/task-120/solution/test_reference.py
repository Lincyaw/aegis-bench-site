import pytest


@pytest.mark.parametrize("case", load_cases("billing"))
def test_billing_rules(case):
    assert apply_rules(case.cart, case.rules).total == case.expected
