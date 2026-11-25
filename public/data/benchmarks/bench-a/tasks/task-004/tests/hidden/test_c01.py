"""C01 已有测试全部通过"""


def test_c01(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
