"""C07 配置项缺省时的行为"""


def test_c07(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
