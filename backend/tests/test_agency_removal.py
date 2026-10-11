"""Tests for agency public page removal (iteration 15)."""
import os
import requests
import pytest

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else "https://elegant-staging-2.preview.emergentagent.com"


@pytest.fixture(scope="module")
def agency_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "agency@test.com", "password": "agency123"})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def indep_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "provider1@lumiere.com", "password": "sophia123"})
    assert r.status_code == 200, r.text
    return s


# --- Removed endpoint returns 404 ---
def test_agencies_public_endpoint_removed():
    r = requests.get(f"{BASE_URL}/api/agencies/agency_ff8af1dbf4a9/public")
    assert r.status_code == 404


def test_agencies_public_any_id_removed():
    r = requests.get(f"{BASE_URL}/api/agencies/anything/public")
    assert r.status_code == 404


# --- Browse still returns agency companions among results ---
def test_browse_lists_providers():
    r = requests.get(f"{BASE_URL}/api/providers")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    return data


def test_agency_companions_appear_on_browse(agency_session):
    # Get agency's owned profiles
    r = agency_session.get(f"{BASE_URL}/api/agency/profiles")
    assert r.status_code == 200
    profiles = r.json().get("profiles", [])
    agency_pids = {p["provider_id"] for p in profiles if p.get("verified")}

    # Browse
    r2 = requests.get(f"{BASE_URL}/api/providers")
    assert r2.status_code == 200
    browse_pids = {p["provider_id"] for p in r2.json()}

    # At least one verified agency companion should appear on browse
    overlap = agency_pids & browse_pids
    assert overlap, f"No agency companions in browse. agency verified pids={agency_pids}, browse pids sample={list(browse_pids)[:5]}"


# --- Provider detail works for agency-owned profiles ---
def test_provider_detail_for_agency_owned(agency_session):
    r = agency_session.get(f"{BASE_URL}/api/agency/profiles")
    profiles = r.json().get("profiles", [])
    assert profiles, "agency has no profiles"
    pid = profiles[0]["provider_id"]
    r2 = requests.get(f"{BASE_URL}/api/providers/{pid}")
    assert r2.status_code == 200
    data = r2.json()
    assert data["provider_id"] == pid
    # user info returned but no separate 'agency' attribution field expected
    assert "user" in data


# --- Regression: independent provider detail works ---
def test_independent_provider_detail(indep_session):
    me = indep_session.get(f"{BASE_URL}/api/auth/me").json()
    # find their profile via agency/profiles endpoint (works for any provider)
    r = indep_session.get(f"{BASE_URL}/api/agency/profiles")
    profiles = r.json().get("profiles", [])
    assert profiles
    pid = profiles[0]["provider_id"]
    r2 = requests.get(f"{BASE_URL}/api/providers/{pid}")
    assert r2.status_code == 200
    assert r2.json()["provider_id"] == pid
