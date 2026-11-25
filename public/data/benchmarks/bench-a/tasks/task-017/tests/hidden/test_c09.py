"""C09 无结果时返回空页"""


def test_c09(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
