"""D2 缺陷版本 2 被检出"""


def test_d2(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
