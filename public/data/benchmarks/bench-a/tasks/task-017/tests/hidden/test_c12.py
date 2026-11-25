"""C12 订单详情接口不受影响"""


def test_c12(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
