"""C03 每页条数不超过上限"""


def test_c03(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
