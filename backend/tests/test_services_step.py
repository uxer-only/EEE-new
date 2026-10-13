"""Backend tests for Step 3 Services persistence (companionshipType, accepts_disabilities, services dict)."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def provider_session():
    s = requests.Session()
    email = f"testp_{int(time.time())}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "testpass123", "name": "Test P",
        "role": "provider", "account_type": "independent"
    }, timeout=20)
    assert r.status_code in (200, 201), f"register: {r.status_code} {r.text}"
    r = s.post(f"{API}/auth/login", json={"email": email, "password": "testpass123"}, timeout=20)
    assert r.status_code == 200, f"login: {r.status_code} {r.text}"
    return s, email


def test_me_authenticated(provider_session):
    s, _ = provider_session
    r = s.get(f"{API}/auth/me", timeout=20)
    assert r.status_code == 200
    assert r.json().get("role") == "provider"


def test_create_profile_with_services_dict(provider_session):
    s, _ = provider_session
    payload = {
        "display_name": "TEST Services Provider",
        "companionshipType": "both",
        "accepts_disabilities": True,
        "services": {
            "Erotic massage": {"type": "inclusive", "price": ""},
            "GFE": {"type": "extra", "price": "40"},
            "Role-play": {"type": "inclusive", "price": ""},
        },
        "location": {"country": "France", "city": "Paris"},
    }
    r = s.post(f"{API}/providers/profile", json=payload, timeout=20)
    assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
    data = r.json()
    pid = data.get("provider_id") or data.get("id") or (data.get("data") or {}).get("provider_id")
    assert pid, f"no provider_id: {data}"

    # Fetch via dashboard stats endpoint
    r2 = s.get(f"{API}/providers/dashboard/stats", timeout=20)
    assert r2.status_code == 200
    prof = r2.json().get("profile") or {}
    assert prof.get("companionshipType") == "both"
    assert prof.get("accepts_disabilities") is True
    svcs = prof.get("services") or {}
    assert isinstance(svcs, dict), f"services not dict: {type(svcs)} {svcs}"
    assert svcs.get("GFE", {}).get("type") == "extra"
    assert str(svcs.get("GFE", {}).get("price")) == "40"
    assert svcs.get("Erotic massage", {}).get("type") == "inclusive"


def test_update_services(provider_session):
    s, _ = provider_session
    r = s.get(f"{API}/providers/dashboard/stats", timeout=20)
    assert r.status_code == 200
    pid = (r.json().get("profile") or {}).get("provider_id")
    assert pid
    patch = {
        "services": {
            "Erotic massage": {"type": "extra", "price": "80"},
            "Classic sex": {"type": "inclusive", "price": ""},
        },
        "accepts_disabilities": False,
        "companionshipType": "escort",
    }
    r = s.put(f"{API}/providers/profile", json=patch, timeout=20)
    assert r.status_code in (200, 204), f"{r.status_code} {r.text}"
    r2 = s.get(f"{API}/providers/dashboard/stats", timeout=20)
    prof = r2.json().get("profile") or {}
    assert prof.get("companionshipType") == "escort"
    assert prof.get("accepts_disabilities") is False
    svcs = prof.get("services") or {}
    assert svcs.get("Erotic massage", {}).get("type") == "extra"
    assert str(svcs.get("Erotic massage", {}).get("price")) == "80"


def test_published_provider_profile_has_services(provider_session):
    """Confirm provider1@lumiere.com returns services (object or array) for grouping on profile page."""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "provider1@lumiere.com", "password": "sophia123"}, timeout=20)
    assert r.status_code == 200, r.text
    r = s.get(f"{API}/providers/dashboard/stats", timeout=20)
    assert r.status_code == 200
    prof = r.json().get("profile") or {}
    pid = prof.get("provider_id")
    assert pid
    # fetch public profile
    r2 = requests.get(f"{API}/providers/{pid}", timeout=20)
    assert r2.status_code == 200
    body = r2.json()
    svcs = body.get("services")
    assert svcs, f"no services on published provider: {body.keys()}"
