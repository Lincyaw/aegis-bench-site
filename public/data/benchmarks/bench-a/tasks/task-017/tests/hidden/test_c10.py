"""C10 单页上限可配置"""


def test_c10(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
