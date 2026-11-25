"""C04 错误输入返回明确的错误"""


def test_c04(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
