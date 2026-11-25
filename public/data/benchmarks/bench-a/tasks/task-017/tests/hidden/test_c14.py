"""C14 返回字段与接口文档一致"""


def test_c14(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
