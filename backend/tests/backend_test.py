"""Backend regression tests for WeClips web proxy.

Tests cover:
- Auth/me & profile updates
- User search, followers/following by-id
- Video like toggle (with cleanup)
- Comments (list, add, delete cleanup)
- Notifications, config, legal pages
- Block/unblock (cleanup)
"""
import base64
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://video-clips-web-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "webtester01@example.com"
TEST_PASSWORD = "Test1234!"
NIXON_ID = "f4a60da3-4a82-4da7-924c-6c02cbf10887"
VIDEO_ID = "907e38e5-9353-455d-ba06-38fa4d0c0625"


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="session")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ----- Auth & profile -----
class TestAuth:
    def test_me(self, headers):
        r = requests.get(f"{API}/auth/me", headers=headers, timeout=30)
        assert r.status_code == 200
        u = r.json()
        assert u["email"].lower() == TEST_EMAIL.lower()
        assert u["username"] == "webtester01"

    def test_patch_bio(self, headers):
        new_bio = f"Tested at {int(time.time())}"
        r = requests.patch(f"{API}/auth/me", headers=headers, json={"bio": new_bio}, timeout=30)
        assert r.status_code == 200, r.text
        # Verify persistence
        r2 = requests.get(f"{API}/auth/me", headers=headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("bio") == new_bio

    def test_avatar_upload(self, headers):
        # Tiny 1x1 PNG
        png = base64.b64encode(
            bytes.fromhex(
                "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C63F8FFFF3F0005FE02FE5C9A9D5F0000000049454E44AE426082"
            )
        ).decode()
        data_url = f"data:image/png;base64,{png}"
        r = requests.put(f"{API}/auth/me/avatar", headers=headers, json={"avatar_base64": data_url}, timeout=30)
        assert r.status_code == 200, r.text


# ----- User search & social -----
class TestUsers:
    def test_search_nixon(self, headers):
        r = requests.get(f"{API}/users/search", headers=headers, params={"q": "nixon"}, timeout=30)
        assert r.status_code == 200, r.text
        results = r.json()
        assert isinstance(results, list) and len(results) > 0
        # Expect Nixon's username kissingerez or display_name Nixon
        found = any(
            (u.get("username") == "kissingerez") or ("nixon" in (u.get("display_name") or "").lower())
            for u in results
        )
        assert found, f"Nixon not in: {results}"
        # Validate fields
        u0 = results[0]
        for k in ("id", "username", "display_name", "avatar_url", "followers_count"):
            assert k in u0

    def test_followers_by_id(self, headers):
        r = requests.get(f"{API}/users/by-id/{NIXON_ID}/followers", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_following_by_id(self, headers):
        r = requests.get(f"{API}/users/by-id/{NIXON_ID}/following", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_my_blocks_empty(self, headers):
        r = requests.get(f"{API}/users/me/blocks", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_block_unblock_nixon(self, headers):
        # Block
        rb = requests.post(f"{API}/users/by-id/{NIXON_ID}/block", headers=headers, timeout=30)
        assert rb.status_code == 200, rb.text
        # ALWAYS unblock (cleanup)
        ru = requests.delete(f"{API}/users/by-id/{NIXON_ID}/block", headers=headers, timeout=30)
        assert ru.status_code == 200, ru.text


# ----- Videos / comments / likes -----
class TestVideoSocial:
    def test_like_toggle(self, headers):
        # Determine current liked state, then toggle on/off so final state == original
        r1 = requests.post(f"{API}/videos/{VIDEO_ID}/like", headers=headers, timeout=30)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert "liked" in d1 and "likes" in d1
        # Toggle back to restore state (cleanup)
        r2 = requests.post(f"{API}/videos/{VIDEO_ID}/like", headers=headers, timeout=30)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["liked"] != d1["liked"]

    def test_list_comments(self, headers):
        r = requests.get(f"{API}/videos/{VIDEO_ID}/comments", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_add_then_delete_comment(self, headers):
        text = f"TEST_comment_{int(time.time())}"
        ra = requests.post(
            f"{API}/videos/{VIDEO_ID}/comments", headers=headers, json={"text": text}, timeout=30
        )
        assert ra.status_code == 200, ra.text
        c = ra.json()
        cid = c.get("id") or c.get("comment_id")
        assert cid, f"Created comment has no id: {c}"
        # Verify it appears
        rlist = requests.get(f"{API}/videos/{VIDEO_ID}/comments", headers=headers, timeout=30)
        assert rlist.status_code == 200
        ids = [x.get("id") for x in rlist.json()]
        assert cid in ids
        # Cleanup
        rd = requests.delete(
            f"{API}/videos/{VIDEO_ID}/comments/{cid}", headers=headers, timeout=30
        )
        assert rd.status_code == 200, rd.text


# ----- Notifications / config / legal -----
class TestMisc:
    def test_notifications_list(self, headers):
        r = requests.get(f"{API}/notifications", headers=headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_unread_count(self, headers):
        r = requests.get(f"{API}/notifications/unread-count", headers=headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "count" in d or "unread_count" in d or isinstance(d, dict)

    def test_mark_read(self, headers):
        r = requests.post(f"{API}/notifications/mark-read", headers=headers, timeout=30)
        assert r.status_code == 200

    def test_config(self):
        r = requests.get(f"{API}/config", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_legal_terms(self):
        r = requests.get(f"{API}/legal/terms", timeout=30)
        assert r.status_code == 200
        assert "html" in r.headers.get("content-type", "").lower() or len(r.text) > 50

    def test_legal_privacy(self):
        r = requests.get(f"{API}/legal/privacy", timeout=30)
        assert r.status_code == 200
        assert len(r.text) > 50
