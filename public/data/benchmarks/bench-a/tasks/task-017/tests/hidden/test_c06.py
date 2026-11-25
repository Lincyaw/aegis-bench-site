"""C06 未知状态返回参数错误"""


def test_c06(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
