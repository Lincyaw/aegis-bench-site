"""C02 新增行为符合需求说明"""


def test_c02(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
