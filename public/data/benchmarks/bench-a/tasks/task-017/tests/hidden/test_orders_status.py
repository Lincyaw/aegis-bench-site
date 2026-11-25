def test_empty_status_is_rejected(client, session):
    resp = client.get("/orders", params={"status": ""}, cookies=session)
    assert resp.status_code == 400
