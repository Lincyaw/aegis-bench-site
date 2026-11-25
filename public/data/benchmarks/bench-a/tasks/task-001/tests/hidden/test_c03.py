"""C03 边界输入的处理"""


def test_c03(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
