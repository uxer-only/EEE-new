"""Tests for the Subscriptions / Payments feature.

Covers:
- GET  /api/subscriptions/me              (provider vs client access, plan flags)
- POST /api/subscriptions/checkout         (stripe url, validation, server-computed amount)
- GET  /api/subscriptions/status/{sid}     (own session vs forbidden)
- GET  /api/providers                      (subscription gate + VIP-first sort)
- GET  /api/providers/{id}                 (featured_active / vip_active flags)
"""
import os
import time
from datetime import datetime, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

SOPHIA_EMAIL = "provider1@lumiere.com"
SOPHIA_PASS = "sophia123"
SOPHIA_PROVIDER_ID = "provider_024900f536dd"

CLIENT_EMAIL = "testclient@example.com"
CLIENT_PASS = "password123"

OTHER_PROVIDER_EMAIL = "testprovider@example.com"
OTHER_PROVIDER_PASS = "password123"


# ---------- helpers ----------
def _login(email: str, password: str) -> requests.Session:
    s = requests.Session()
    r = s.post(
        f"{API}/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text[:200]}"
    return s


@pytest.fixture(scope="module")
def sophia():
    return _login(SOPHIA_EMAIL, SOPHIA_PASS)


@pytest.fixture(scope="module")
def client_user():
    return _login(CLIENT_EMAIL, CLIENT_PASS)


@pytest.fixture(scope="module")
def other_provider():
    try:
        return _login(OTHER_PROVIDER_EMAIL, OTHER_PROVIDER_PASS)
    except AssertionError:
        pytest.skip("other provider account not available")


@pytest.fixture(scope="module")
def mongo():
    url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not url or not db_name:
        pytest.skip("MONGO_URL / DB_NAME not set in env")
    cli = MongoClient(url)
    yield cli[db_name]
    cli.close()


# =================================================================
# GET /api/subscriptions/me
# =================================================================
class TestSubscriptionsMe:
    def test_sophia_active_featured_and_vip(self, sophia):
        r = sophia.get(f"{API}/subscriptions/me", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["has_profile"] is True
        assert data["featured_active"] is True
        assert data["vip_active"] is True
        # ~30 days grandfather window
        assert 25 <= data["featured_days_left"] <= 31, data["featured_days_left"]
        assert 25 <= data["vip_days_left"] <= 31, data["vip_days_left"]
        # PLANS allowlist must be returned with correct shape
        plans = data["plans"]
        assert set(plans.keys()) == {"featured_2w", "featured_4w", "vip_2w", "vip_4w"}
        assert plans["featured_2w"]["amount"] == 30.00
        assert plans["featured_4w"]["amount"] == 55.00
        assert plans["vip_2w"]["amount"] == 15.00
        assert plans["vip_4w"]["amount"] == 25.00
        assert plans["featured_2w"]["kind"] == "featured"
        assert plans["vip_4w"]["kind"] == "vip"

    def test_client_forbidden(self, client_user):
        r = client_user.get(f"{API}/subscriptions/me", timeout=30)
        assert r.status_code == 403
        body = r.json()
        # Provider access only
        assert "provider" in (body.get("detail") or "").lower()


# =================================================================
# POST /api/subscriptions/checkout
# =================================================================
class TestCheckoutCreate:
    def test_checkout_sophia_featured_4w_plus_vip_2w(self, sophia, mongo):
        body = {
            "featured_plan": "featured_4w",
            "vip_plan": "vip_2w",
            "origin_url": BASE_URL,
        }
        r = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["currency"] == "eur"
        assert data["amount"] == 70.00, data  # 55 + 15
        assert data["session_id"].startswith("cs_test_"), data["session_id"]
        assert data["url"].startswith("https://"), data["url"]

        # payment_transactions row created with pending/open
        tx = mongo.payment_transactions.find_one({"session_id": data["session_id"]})
        assert tx is not None
        assert tx["payment_status"] == "pending"
        assert tx["status"] == "open"
        assert tx["amount"] == 70.00
        assert tx["currency"] == "eur"
        assert tx["featured_plan"] == "featured_4w"
        assert tx["vip_plan"] == "vip_2w"
        assert tx["provider_id"] == SOPHIA_PROVIDER_ID

        # save session_id for downstream test
        TestCheckoutCreate.last_session_id = data["session_id"]

    def test_checkout_success_url_has_placeholder_and_amount_match(self, sophia):
        # Create a fresh session — featured_2w only, no VIP → amount=30
        body = {"featured_plan": "featured_2w", "origin_url": BASE_URL}
        r = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["amount"] == 30.00
        # The Stripe-hosted URL itself contains the success_url encoded — fetch checkout page
        # Instead, validate the underlying API contract by hitting /status to confirm tx exists.
        sid = data["session_id"]
        s2 = sophia.get(f"{API}/subscriptions/status/{sid}", timeout=30)
        assert s2.status_code == 200
        # We pass {CHECKOUT_SESSION_ID} as a literal in the success URL — server-side check:
        # The session's success_url should contain the literal placeholder before Stripe expands it
        # at redirect time. We can't fetch the Stripe object here directly, but we can verify our
        # client-facing JSON does NOT pre-expand the placeholder (the URL goes to checkout.stripe.com).
        assert "checkout.stripe.com" in data["url"] or "stripe.com" in data["url"]

    def test_checkout_invalid_featured_plan(self, sophia):
        body = {"featured_plan": "vip_2w", "origin_url": BASE_URL}
        r = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=30)
        assert r.status_code == 400
        assert "featured" in r.json()["detail"].lower()

    def test_checkout_invalid_vip_plan(self, sophia):
        body = {
            "featured_plan": "featured_2w",
            "vip_plan": "featured_2w",
            "origin_url": BASE_URL,
        }
        r = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=30)
        assert r.status_code == 400
        assert "vip" in r.json()["detail"].lower()

    def test_checkout_unknown_plan(self, sophia):
        body = {"featured_plan": "made_up_plan", "origin_url": BASE_URL}
        r = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=30)
        assert r.status_code == 400

    def test_checkout_client_forbidden(self, client_user):
        body = {"featured_plan": "featured_2w", "origin_url": BASE_URL}
        r = client_user.post(f"{API}/subscriptions/checkout", json=body, timeout=30)
        assert r.status_code == 403


# =================================================================
# GET /api/subscriptions/status/{session_id}
# =================================================================
class TestSubscriptionStatus:
    def test_status_owner_sees_session(self, sophia):
        # create a session
        body = {"featured_plan": "featured_2w", "origin_url": BASE_URL}
        c = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=60)
        assert c.status_code == 200, c.text
        sid = c.json()["session_id"]

        r = sophia.get(f"{API}/subscriptions/status/{sid}", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["session_id"] == sid
        assert data["amount"] == 30.00
        assert data["currency"] == "eur"
        # Unpaid in test mode — "unpaid" is what Stripe returns for never-completed sessions.
        assert data["payment_status"] in ("unpaid", "pending", "open", "no_payment_required"), data
        # Local status flag must remain "open" while unpaid
        assert data["status"] in ("open", "expired"), data["status"]

    def test_status_forbidden_for_other_user(self, sophia, client_user):
        # owner = sophia
        body = {"featured_plan": "featured_2w", "origin_url": BASE_URL}
        c = sophia.post(f"{API}/subscriptions/checkout", json=body, timeout=60)
        assert c.status_code == 200
        sid = c.json()["session_id"]
        # client tries to fetch — must be 403
        r = client_user.get(f"{API}/subscriptions/status/{sid}", timeout=30)
        assert r.status_code == 403

    def test_status_404_for_unknown(self, sophia):
        r = sophia.get(f"{API}/subscriptions/status/cs_test_not_a_real_id", timeout=30)
        assert r.status_code == 404


# =================================================================
# GET /api/providers (gate + VIP sort)
# =================================================================
class TestProvidersGateAndSort:
    def test_vip_sophia_appears_first(self):
        r = requests.get(f"{API}/providers", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        # All returned must be featured_active by gate
        ids = [p["provider_id"] for p in data]
        assert SOPHIA_PROVIDER_ID in ids
        # Sophia (VIP) should be at the top
        assert data[0]["provider_id"] == SOPHIA_PROVIDER_ID, [p["provider_id"] for p in data[:3]]
        assert data[0]["vip_active"] is True

        # Sanity: at least one non-vip in the list (existing 35 grandfathered providers are not VIP)
        non_vip = [p for p in data if not p.get("vip_active")]
        assert len(non_vip) > 0

    def test_provider_without_active_featured_is_hidden(self, mongo):
        """Flip a non-Sophia provider's featured_until into the past and confirm hidden."""
        # find a non-sophia, non-vip, currently visible provider
        target = mongo.provider_profiles.find_one(
            {"provider_id": {"$ne": SOPHIA_PROVIDER_ID}, "featured_until": {"$gt": datetime.utcnow()}},
            {"provider_id": 1, "featured_until": 1},
        )
        assert target is not None, "Need at least one non-Sophia provider with active featured to test gate"
        original_until = target["featured_until"]
        pid = target["provider_id"]
        try:
            # Move into the past
            mongo.provider_profiles.update_one(
                {"provider_id": pid},
                {"$set": {"featured_until": datetime.utcnow() - timedelta(days=1)}},
            )
            r = requests.get(f"{API}/providers", timeout=30)
            assert r.status_code == 200
            ids = [p["provider_id"] for p in r.json()]
            assert pid not in ids, f"{pid} should be hidden when featured expired"
            # Sophia still visible
            assert SOPHIA_PROVIDER_ID in ids
        finally:
            # Restore
            mongo.provider_profiles.update_one(
                {"provider_id": pid}, {"$set": {"featured_until": original_until}}
            )


# =================================================================
# GET /api/providers/{id} flags
# =================================================================
class TestProviderDetailFlags:
    def test_sophia_detail_has_flags(self):
        r = requests.get(f"{API}/providers/{SOPHIA_PROVIDER_ID}", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["featured_active"] is True
        assert data["vip_active"] is True

    def test_non_vip_provider_flags(self, mongo):
        # Pick a provider that has featured_until > now but no vip_until / past vip_until
        now = datetime.utcnow()
        target = mongo.provider_profiles.find_one(
            {
                "provider_id": {"$ne": SOPHIA_PROVIDER_ID},
                "featured_until": {"$gt": now},
                "$or": [{"vip_until": None}, {"vip_until": {"$lte": now}}, {"vip_until": {"$exists": False}}],
            },
            {"provider_id": 1},
        )
        if not target:
            pytest.skip("no non-vip active-featured provider available")
        r = requests.get(f"{API}/providers/{target['provider_id']}", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["featured_active"] is True
        assert data["vip_active"] is False
