"""Agency accounts backend tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

AGENCY_EMAIL = "agency_1788425952@test.com"
AGENCY_PASSWORD = "agency1234"
INDEP_EMAIL = "provider1@lumiere.com"
INDEP_PASSWORD = "sophia123"


def _make_session(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def agency_sess():
    s, data = _make_session(AGENCY_EMAIL, AGENCY_PASSWORD)
    return s, data


@pytest.fixture(scope="module")
def indep_sess():
    s, data = _make_session(INDEP_EMAIL, INDEP_PASSWORD)
    return s, data


# --- Auth returns account_type ---
def test_agency_login_returns_account_type(agency_sess):
    _, data = agency_sess
    assert data.get("account_type") == "agency"


def test_independent_login_returns_account_type(indep_sess):
    _, data = indep_sess
    assert data.get("account_type") in ("independent", None)  # legacy accounts may be None


# --- Roster ---
def test_agency_profiles_lists_both(agency_sess):
    s, _ = agency_sess
    r = s.get(f"{BASE_URL}/api/agency/profiles")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("account_type") == "agency"
    profiles = body.get("profiles", [])
    assert len(profiles) >= 2, f"expected >=2, got {len(profiles)}"
    names = {p.get("display_name") for p in profiles}
    assert "Anna" in names and "Bella" in names, f"names={names}"
    # cities
    locs = {(p.get("display_name"), (p.get("location") or {}).get("city")) for p in profiles}
    assert ("Anna", "Paris") in locs and ("Bella", "Berlin") in locs, locs


def test_scoped_endpoints_for_agency_profile(agency_sess):
    s, _ = agency_sess
    r = s.get(f"{BASE_URL}/api/agency/profiles")
    profiles = r.json()["profiles"]
    anna = next(p for p in profiles if p["display_name"] == "Anna")
    bella = next(p for p in profiles if p["display_name"] == "Bella")

    for pid in (anna["provider_id"], bella["provider_id"]):
        r2 = s.get(f"{BASE_URL}/api/subscriptions/me", params={"provider_id": pid})
        assert r2.status_code == 200, f"subs {pid}: {r2.status_code} {r2.text}"
        r3 = s.get(f"{BASE_URL}/api/enquiries/mine", params={"provider_id": pid})
        assert r3.status_code == 200, f"enq {pid}: {r3.status_code} {r3.text}"
        r4 = s.get(f"{BASE_URL}/api/invoices/mine", params={"provider_id": pid})
        assert r4.status_code == 200, f"inv {pid}: {r4.status_code} {r4.text}"


def test_scoped_enquiries_separate_per_profile(agency_sess):
    s, _ = agency_sess
    profiles = s.get(f"{BASE_URL}/api/agency/profiles").json()["profiles"]
    anna = next(p for p in profiles if p["display_name"] == "Anna")
    bella = next(p for p in profiles if p["display_name"] == "Bella")
    ea = s.get(f"{BASE_URL}/api/enquiries/mine", params={"provider_id": anna["provider_id"]}).json()
    eb = s.get(f"{BASE_URL}/api/enquiries/mine", params={"provider_id": bella["provider_id"]}).json()
    anna_items = ea.get("enquiries") or ea.get("items") or (ea if isinstance(ea, list) else [])
    bella_items = eb.get("enquiries") or eb.get("items") or (eb if isinstance(eb, list) else [])
    # Anna >=1, Bella 0 per problem statement
    assert len(anna_items) >= 1, f"expected Anna enquiries>=1, got {anna_items}"
    assert len(bella_items) == 0, f"expected Bella=0, got {bella_items}"


# --- Independent cannot create second profile ---
def test_independent_cannot_create_second_profile(indep_sess):
    s, _ = indep_sess
    payload = {
        "display_name": "TEST_second_profile",
        "bio": "should fail",
        "location": {"city": "Paris", "country": "France"},
    }
    r = s.post(f"{BASE_URL}/api/providers/profile", json=payload)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"


# --- Ownership isolation: agency cannot scope to independent's provider_id ---
def test_ownership_isolation(agency_sess, indep_sess):
    s_indep, _ = indep_sess
    # find indep provider_id via dashboard
    r = s_indep.get(f"{BASE_URL}/api/providers/dashboard")
    if r.status_code != 200:
        pytest.skip(f"indep dashboard not accessible: {r.status_code}")
    indep_pid = r.json().get("provider_id") or (r.json().get("profile") or {}).get("provider_id")
    if not indep_pid:
        pytest.skip("no indep provider_id")

    s_ag, _ = agency_sess
    r2 = s_ag.get(f"{BASE_URL}/api/enquiries/mine", params={"provider_id": indep_pid})
    # Should NOT return indep data (may return empty or 403/404)
    if r2.status_code == 200:
        body = r2.json()
        items = body.get("enquiries") or body.get("items") or (body if isinstance(body, list) else [])
        assert len(items) == 0, "ownership leak!"
    else:
        assert r2.status_code in (403, 404)


# --- Fresh agency register ---
def test_fresh_agency_registration_and_empty_roster():
    email = f"test_agency_{int(time.time())}@test.com"
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "testpass123", "name": "Test Agency",
        "role": "provider", "account_type": "agency",
    })
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body.get("account_type") == "agency", body
    r2 = s.get(f"{BASE_URL}/api/agency/profiles")
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert body2.get("account_type") == "agency"
    assert body2.get("profiles") == []


def test_agency_can_create_multiple_profiles():
    email = f"test_agency_multi_{int(time.time())}@test.com"
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "testpass123", "name": "Multi Agency",
        "role": "provider", "account_type": "agency",
    })
    assert r.status_code in (200, 201), r.text
    for i in range(2):
        r2 = s.post(f"{BASE_URL}/api/providers/profile", json={
            "display_name": f"TEST_profile_{i}",
            "bio": "x",
            "location": {"city": "Paris", "country": "France"},
        })
        assert r2.status_code in (200, 201), r2.text
    r3 = s.get(f"{BASE_URL}/api/agency/profiles")
    assert len(r3.json()["profiles"]) == 2
