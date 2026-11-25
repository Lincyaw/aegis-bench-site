"""D4 缺陷版本 4 被检出"""


def test_d4(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
