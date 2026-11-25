"""C08 游标格式错误时返回参数错误"""


def test_c08(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
