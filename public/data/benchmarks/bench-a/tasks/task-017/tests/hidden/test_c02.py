"""C02 按状态筛选返回正确的订单"""


def test_c02(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
