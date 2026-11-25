"""D1 缺陷版本 1 被检出"""


def test_d1(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
