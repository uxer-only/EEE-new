"""Tests for the new agency onboarding + bulk activation feature."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

AGENCY_EMAIL = "agency@test.com"
AGENCY_PASSWORD = "agency123"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return s, r.json()


def _register_agency(email, password="testpass123"):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": password, "name": "Fresh Agency",
        "role": "provider", "account_type": "agency",
    })
    assert r.status_code in (200, 201), r.text
    return s


# --- Fresh agency: /agency/profile returns onboarded=false ---
def test_fresh_agency_not_onboarded():
    email = f"test_fresh_{int(time.time())}@test.com"
    s = _register_agency(email)
    r = s.get(f"{BASE_URL}/api/agency/profile")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("onboarded") is False, body


# --- POST /agency/profile saves + onboarded flips true ---
def test_save_agency_profile_and_flip_onboarded():
    email = f"test_onboard_{int(time.time())}@test.com"
    s = _register_agency(email)
    payload = {
        "agency_name": "TEST Agency Onboarding",
        "city": "Paris",
        "country": "France",
        "description": "desc",
        "languages": ["English", "French"],
        "default_services": ["Dinner date", "Travel companion"],
        "apply_services_to_all": True,
        "default_rates": {"1h": 300, "2h": 500, "overnight": 1500},
        "default_availability": {"days": ["Mon", "Tue"], "hours": "10-22"},
    }
    r = s.post(f"{BASE_URL}/api/agency/profile", json=payload)
    assert r.status_code in (200, 201), r.text
    assert r.json().get("onboarded") is True
    # verify GET reflects it
    r2 = s.get(f"{BASE_URL}/api/agency/profile")
    assert r2.json().get("onboarded") is True
    assert r2.json().get("agency_name") == "TEST Agency Onboarding"


# --- Onboarded seeded agency: onboarded=true, has 3 profiles ---
def test_seeded_agency_onboarded_with_three_profiles():
    s, data = _login(AGENCY_EMAIL, AGENCY_PASSWORD)
    assert data.get("account_type") == "agency"
    prof = s.get(f"{BASE_URL}/api/agency/profile").json()
    assert prof.get("onboarded") is True, prof
    roster = s.get(f"{BASE_URL}/api/agency/profiles").json()
    profiles = roster.get("profiles", [])
    assert len(profiles) >= 3, f"expected >=3, got {len(profiles)}"
    names = {p.get("display_name") for p in profiles}
    for expected in ("Sofia", "Valentina", "Amara"):
        assert expected in names, f"missing {expected} in {names}"


# --- PUT plan endpoint: valid featured + vip + persistence via GET ---
def test_set_and_clear_plan_persistence():
    s, _ = _login(AGENCY_EMAIL, AGENCY_PASSWORD)
    profiles = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    amara = next((p for p in profiles if p["display_name"] == "Amara"), profiles[-1])
    pid = amara["provider_id"]

    # Set 2w + vip_2w
    r = s.put(f"{BASE_URL}/api/agency/profiles/{pid}/plan", json={
        "featured_plan": "agency_featured_2w", "vip_plan": "vip_2w",
    })
    assert r.status_code == 200, r.text
    pending = r.json().get("pending_plan")
    assert pending["featured_plan"] == "agency_featured_2w"
    assert pending["vip_plan"] == "vip_2w"

    # Persistence via roster
    profiles2 = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    amara2 = next(p for p in profiles2 if p["provider_id"] == pid)
    assert amara2.get("pending_plan", {}).get("featured_plan") == "agency_featured_2w"

    # Clear
    r2 = s.put(f"{BASE_URL}/api/agency/profiles/{pid}/plan", json={"featured_plan": None})
    assert r2.status_code == 200
    assert r2.json().get("pending_plan") is None
    profiles3 = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    amara3 = next(p for p in profiles3 if p["provider_id"] == pid)
    assert not amara3.get("pending_plan")


# --- Invalid featured_plan id rejected ---
def test_invalid_featured_plan_rejected():
    s, _ = _login(AGENCY_EMAIL, AGENCY_PASSWORD)
    profiles = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    pid = profiles[0]["provider_id"]
    r = s.put(f"{BASE_URL}/api/agency/profiles/{pid}/plan", json={
        "featured_plan": "not_a_real_plan",
    })
    assert r.status_code == 400, r.text


# --- Ownership: cannot set plan on someone else's profile ---
def test_plan_ownership_isolation():
    s, _ = _login(AGENCY_EMAIL, AGENCY_PASSWORD)
    # someone else's provider_id (indep sophia)
    r = s.put(f"{BASE_URL}/api/agency/profiles/provider_024900f536dd/plan", json={
        "featured_plan": "agency_featured_2w",
    })
    assert r.status_code in (403, 404), r.text


# --- Bulk checkout sums correctly + returns url ---
def test_bulk_checkout_sums_and_returns_url():
    s, _ = _login(AGENCY_EMAIL, AGENCY_PASSWORD)
    profiles = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    sofia = next(p for p in profiles if p["display_name"] == "Sofia")
    valentina = next(p for p in profiles if p["display_name"] == "Valentina")
    amara = next(p for p in profiles if p["display_name"] == "Amara")

    # Set Sofia = 4w + vip_4w (50+25=75), Valentina = 2w (30), Amara = cleared
    s.put(f"{BASE_URL}/api/agency/profiles/{sofia['provider_id']}/plan", json={
        "featured_plan": "agency_featured_4w", "vip_plan": "vip_4w"})
    s.put(f"{BASE_URL}/api/agency/profiles/{valentina['provider_id']}/plan", json={
        "featured_plan": "agency_featured_2w"})
    s.put(f"{BASE_URL}/api/agency/profiles/{amara['provider_id']}/plan", json={
        "featured_plan": None})

    r = s.post(f"{BASE_URL}/api/subscriptions/checkout-bulk", json={
        "origin_url": "https://example.com"
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profile_count"] == 2, body
    assert abs(body["amount"] - 105.0) < 0.01, body
    assert body.get("url", "").startswith("http"), body


# --- Bulk checkout with no pending returns 400 ---
def test_bulk_checkout_requires_at_least_one_plan():
    email = f"test_empty_{int(time.time())}@test.com"
    s = _register_agency(email)
    r = s.post(f"{BASE_URL}/api/subscriptions/checkout-bulk",
               json={"origin_url": "https://example.com"})
    assert r.status_code == 400, r.text


# --- PLANS contains agency_featured_2w/4w with correct amounts ---
def test_agency_plan_pricing():
    # Indirectly verified by summed checkout above; also check via a set+read cycle
    s, _ = _login(AGENCY_EMAIL, AGENCY_PASSWORD)
    profiles = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    pid = profiles[0]["provider_id"]
    r = s.put(f"{BASE_URL}/api/agency/profiles/{pid}/plan", json={
        "featured_plan": "agency_featured_4w"})
    assert r.status_code == 200
    # Now bulk with just this profile → amount should equal 50
    # Clear others first
    for p in profiles[1:]:
        s.put(f"{BASE_URL}/api/agency/profiles/{p['provider_id']}/plan",
              json={"featured_plan": None})
    r2 = s.post(f"{BASE_URL}/api/subscriptions/checkout-bulk",
                json={"origin_url": "https://example.com"})
    assert r2.status_code == 200, r2.text
    assert abs(r2.json()["amount"] - 50.0) < 0.01
