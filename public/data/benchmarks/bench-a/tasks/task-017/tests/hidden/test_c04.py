"""C04 游标翻页不重复、不遗漏"""


def test_c04(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
