"""Tests for the overview-page redesign:
- GET /api/providers/media/mine (new provider media endpoint)
- Auto-renew toggle persistence
- Agency scope on the media endpoint
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def provider_session():
    return _login("provider1@lumiere.com", "sophia123")


@pytest.fixture(scope="module")
def agency_session():
    return _login("agency@test.com", "agency123")


@pytest.fixture(scope="module")
def client_session():
    return _login("testclient@example.com", "password123")


# ---------------- GET /providers/media/mine ----------------
class TestMediaMine:
    def test_provider_media_mine_200(self, provider_session):
        r = provider_session.get(f"{API}/providers/media/mine", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "media" in data and isinstance(data["media"], list)
        assert len(data["media"]) > 0, "Sophia was seeded with media; expected non-empty"
        # Validate each item structure
        for item in data["media"]:
            assert "media_id" in item
            assert "url" in item
            assert "media_type" in item
            assert "status" in item
            assert item["media_type"] in ("photo", "video")
            assert item["status"] in ("approved", "pending", "rejected")

    def test_provider_media_mine_has_video_and_pending(self, provider_session):
        r = provider_session.get(f"{API}/providers/media/mine", timeout=20)
        data = r.json()
        types = {it["media_type"] for it in data["media"]}
        statuses = {it["status"] for it in data["media"]}
        # Per request: seeded 1 video + 1 pending media doc
        assert "video" in types, f"Expected video in media_types; got {types}"
        assert "pending" in statuses, f"Expected a pending media; got {statuses}"

    def test_provider_media_mine_ordering(self, provider_session):
        r = provider_session.get(f"{API}/providers/media/mine", timeout=20)
        data = r.json()
        # approved photos first, then videos, then pending/rejected
        def _rank(it):
            if it["status"] == "approved" and it["media_type"] == "photo":
                return 0
            if it["media_type"] == "video":
                return 1
            return 2
        ranks = [_rank(it) for it in data["media"]]
        assert ranks == sorted(ranks), f"Media not ordered: {ranks}"

    def test_media_mine_forbidden_for_client(self, client_session):
        r = client_session.get(f"{API}/providers/media/mine", timeout=20)
        assert r.status_code == 403, f"Expected 403 for client, got {r.status_code}"

    def test_media_mine_unauthenticated(self):
        r = requests.get(f"{API}/providers/media/mine", timeout=20)
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


# ---------------- Agency scope ----------------
class TestAgencyMediaScope:
    def test_agency_can_resolve_managed_profile_media(self, agency_session):
        # Fetch agency's roster
        r = agency_session.get(f"{API}/agency/profiles", timeout=20)
        assert r.status_code == 200, r.text
        profiles = r.json().get("profiles") or r.json()
        assert len(profiles) > 0
        pid = profiles[0].get("provider_id") or profiles[0].get("id")
        assert pid

        r2 = agency_session.get(f"{API}/providers/media/mine", params={"provider_id": pid}, timeout=20)
        assert r2.status_code == 200, f"Agency scoped media call failed: {r2.status_code} {r2.text}"
        assert "media" in r2.json()

    def test_agency_cannot_access_other_providers_media(self, agency_session):
        # Sophia belongs to provider1 user, not to agency
        r = agency_session.get(
            f"{API}/providers/media/mine",
            params={"provider_id": "provider_024900f536dd"},
            timeout=20,
        )
        # Should be 403/404 (not owned by this agency)
        assert r.status_code in (403, 404), f"Expected 403/404, got {r.status_code} {r.text}"


# ---------------- Auto-renew ----------------
class TestAutoRenewPersistence:
    def test_auto_renew_toggle_persists(self, provider_session):
        s = provider_session
        before = s.get(f"{API}/subscriptions/me", timeout=20)
        assert before.status_code == 200, before.text
        initial = bool(before.json().get("auto_renew"))

        new_val = not initial
        r = s.put(f"{API}/subscriptions/auto-renew", json={"auto_renew": new_val}, timeout=20)
        assert r.status_code in (200, 204), f"PUT auto-renew failed: {r.status_code} {r.text}"

        after = s.get(f"{API}/subscriptions/me", timeout=20)
        assert after.status_code == 200
        assert bool(after.json().get("auto_renew")) == new_val, "auto_renew did not persist"

        # Restore
        s.put(f"{API}/subscriptions/auto-renew", json={"auto_renew": initial}, timeout=20)


# ---------------- Overview supporting endpoints ----------------
class TestOverviewSupportingEndpoints:
    def test_subscriptions_me(self, provider_session):
        r = provider_session.get(f"{API}/subscriptions/me", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # Fields used by the overview status card
        for key in ("featured_active", "vip_active", "auto_renew"):
            assert key in d, f"Missing {key} in subscriptions/me"

    def test_invoices_mine(self, provider_session):
        r = provider_session.get(f"{API}/invoices/mine", timeout=20)
        assert r.status_code == 200, r.text
        assert "invoices" in r.json()

    def test_enquiries_or_messages(self, provider_session):
        # The overview messages card pulls from one of these endpoints — just ensure one responds 200
        candidates = ["/enquiries/mine", "/messages/mine", "/providers/enquiries/mine"]
        got_200 = False
        for p in candidates:
            r = provider_session.get(f"{API}{p}", timeout=20)
            if r.status_code == 200:
                got_200 = True
                break
        assert got_200, "No messages/enquiries endpoint returned 200"
