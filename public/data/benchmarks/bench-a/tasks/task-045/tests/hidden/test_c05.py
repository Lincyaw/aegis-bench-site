"""C05 已有接口的行为不变"""


def test_c05(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
