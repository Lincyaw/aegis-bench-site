"""C05 翻页之间排序稳定"""


def test_c05(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
