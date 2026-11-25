"""C13 已有分页参数保持兼容"""


def test_c13(client, case):
    resp = client.request(case.method, case.path, json=case.body)
    assert resp.status_code == case.status
