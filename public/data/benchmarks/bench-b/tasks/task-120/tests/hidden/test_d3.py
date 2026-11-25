"""D3 缺陷版本 3 被检出"""


def test_d3(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
