def test_cursor_past_last_page_returns_empty(client, session):
    resp = client.get("/orders", params={"status": "paid", "cursor": LAST_PAGE_CURSOR + "1"}, cookies=session)
    assert resp.status_code == 200 and resp.json()["items"] == []
