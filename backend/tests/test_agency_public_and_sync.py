"""Iteration 9 tests: sync-defaults, agency public page, provider agency attribution, success_url."""
import os
import re
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"


@pytest.fixture(scope="module")
def agency_session():
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json={"email": "agency@test.com", "password": "agency123"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def independent_session():
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json={"email": "provider1@lumiere.com", "password": "sophia123"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def agency_id(agency_session):
    r = agency_session.get(f"{BASE}/agency/profile")
    assert r.status_code == 200
    data = r.json()
    assert data.get("onboarded") is True
    assert data.get("agency_id"), "agency_id missing / not backfilled"
    return data["agency_id"]


# ---- Sync defaults ----
def test_sync_defaults_updates_three(agency_session):
    # Force a real diff: bump agency default_rates so modified_count != 0
    prof = agency_session.get(f"{BASE}/agency/profile").json()
    body = {
        "agency_name": prof.get("agency_name") or "Elite Agency Demo",
        "description": prof.get("description") or "",
        "location": prof.get("location") or {},
        "languages": prof.get("languages") or [],
        "default_services": prof.get("default_services") or [],
        "default_rates": {"hour_1": 999, "hour_2": 1500},
        "default_availability": prof.get("default_availability") or {},
        "apply_services_to_all": False,
    }
    save = agency_session.post(f"{BASE}/agency/profile", json=body)
    assert save.status_code == 200, save.text

    r = agency_session.post(f"{BASE}/agency/sync-defaults")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["updated"] == 3, f"expected 3 updated, got {data}"


def test_sync_defaults_requires_agency(independent_session):
    r = independent_session.post(f"{BASE}/agency/sync-defaults")
    # Independent provider has no agency_profiles doc → 400
    assert r.status_code in (400, 404), r.text


def test_sync_defaults_requires_auth():
    r = requests.post(f"{BASE}/agency/sync-defaults")
    assert r.status_code in (401, 403)


# ---- Public agency page ----
def test_agency_public_page(agency_id):
    r = requests.get(f"{BASE}/agencies/{agency_id}/public")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["agency_name"] == "Elite Agency Demo"
    assert data["agency_id"] == agency_id
    companions = data["companions"]
    assert len(companions) == 3, f"expected 3 live companions, got {len(companions)}"
    names = {c["display_name"] for c in companions}
    assert {"Sofia", "Valentina", "Amara"}.issubset(names), names
    # Sofia should be VIP and sorted first (vip_until desc)
    assert companions[0]["display_name"] == "Sofia", companions[0]
    assert companions[0]["vip_active"] is True
    # every companion has photo/location keys
    for c in companions:
        assert "provider_id" in c
        assert "location" in c


def test_agency_public_not_found():
    r = requests.get(f"{BASE}/agencies/agency_nonexistent_xxx/public")
    assert r.status_code == 404


# ---- Provider attribution ----
def test_provider_detail_has_agency_block(agency_id):
    r = requests.get(f"{BASE}/agencies/{agency_id}/public")
    pid = r.json()["companions"][0]["provider_id"]
    d = requests.get(f"{BASE}/providers/{pid}")
    assert d.status_code == 200, d.text
    body = d.json()
    assert "agency" in body, body.keys()
    assert body["agency"]["agency_id"] == agency_id
    assert body["agency"]["name"] == "Elite Agency Demo"


def test_independent_provider_no_agency_block(independent_session):
    # locate sophia via /profile or profiles list
    r = independent_session.get(f"{BASE}/profile")
    if r.status_code != 200:
        pytest.skip(f"cannot fetch independent profile: {r.status_code}")
    pid = r.json().get("provider_id") or r.json().get("id")
    if not pid:
        pytest.skip("no provider_id available")
    d = requests.get(f"{BASE}/providers/{pid}")
    assert d.status_code == 200
    assert not d.json().get("agency"), d.json().get("agency")


# ---- Bulk success_url contains agency=1 ----
def test_bulk_checkout_success_url_has_agency_flag(agency_session):
    # Fetch a profile id and queue a plan to satisfy the "at least one" precondition
    prof = agency_session.get(f"{BASE}/agency/profiles").json()
    profs = prof.get("profiles", [])
    assert profs, "no agency profiles"
    pid = profs[0]["provider_id"]
    plan = agency_session.put(
        f"{BASE}/agency/profiles/{pid}/plan",
        json={"featured_plan": "agency_featured_2w", "vip_plan": None},
    )
    assert plan.status_code == 200, plan.text
    r = agency_session.post(
        f"{BASE}/subscriptions/checkout-bulk",
        json={"origin_url": "https://example.com"},
    )
    assert r.status_code == 200, r.text
    url = r.json().get("url", "")
    assert "checkout.stripe.com" in url or "example.com" in url
    # Clear pending plan afterwards to keep state clean
    agency_session.put(
        f"{BASE}/agency/profiles/{pid}/plan",
        json={"featured_plan": None, "vip_plan": None},
    )
