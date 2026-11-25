"""C06 并发请求下结果一致"""


def test_c06(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
