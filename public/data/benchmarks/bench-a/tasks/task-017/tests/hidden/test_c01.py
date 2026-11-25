"""C01 已有接口的返回格式不变"""


def test_c01(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
