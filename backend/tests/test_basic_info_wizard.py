"""Backend regression for Basic Info wizard: register independent provider,
create/update draft via /api/providers/profile, verify characteristics persist
including new breast_size / breast_type fields."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set in env"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def registered(session):
    email = f"TEST_wizard_{uuid.uuid4().hex[:8]}@example.com"
    password = "test1234"
    r = session.post(
        f"{API}/auth/register",
        json={
            "email": email,
            "password": password,
            "name": "Wizard Tester",
            "role": "provider",
            "account_type": "independent",
        },
        timeout=20,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "provider"
    assert data["account_type"] == "independent"
    return {"email": email, "password": password, "user_id": data["user_id"]}


def test_me_returns_user(session, registered):
    r = session.get(f"{API}/auth/me", timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == registered["email"]


def test_create_profile_draft(session, registered):
    payload = {
        "display_name": "TEST_Mila",
        "account_type": "independent",
        "age": 27,
        "gender": "female",
        "location": {"city": "Brussels", "country": "Belgium"},
        "bio": "warm and curious",
        "contact": {"email": registered["email"], "hasTelegram": True, "telegramId": "mila.brussels"},
        "characteristics": {
            "orientation": "Bi",
            "nationality": "Belgian",
            "height": "170",
            "weight": "58",
            "ethnicity": "European",
            "breast_size": "C",
            "breast_type": "Enhanced",
            "tattoos": "yes",
            "languages": ["English", "French"],
        },
        "photos": [],
    }
    r = session.post(f"{API}/providers/profile", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    pid = r.json()["provider_id"]
    assert pid.startswith("provider_")
    # Save provider_id for later tests
    pytest.wizard_provider_id = pid


def test_duplicate_create_is_rejected(session):
    # Second POST for independent should fail with 400
    r = session.post(
        f"{API}/providers/profile",
        json={
            "display_name": "TEST_Mila2",
            "account_type": "independent",
            "location": {"city": "Antwerp", "country": "Belgium"},
            "contact": {},
            "characteristics": {},
            "photos": [],
        },
        timeout=20,
    )
    assert r.status_code == 400, r.text


def test_update_profile_via_put(session):
    pid = pytest.wizard_provider_id
    # Update: change breast_size & bio
    r = session.put(
        f"{API}/providers/profile",
        params={"provider_id": pid},
        json={
            "bio": "warm and curious — updated",
            "characteristics": {
                "orientation": "Bi",
                "nationality": "Belgian",
                "height": "170",
                "weight": "58",
                "ethnicity": "European",
                "breast_size": "D",
                "breast_type": "Enhanced",
                "tattoos": "yes",
            },
        },
        timeout=20,
    )
    assert r.status_code == 200, r.text


def test_get_profile_persists_characteristics(session):
    pid = pytest.wizard_provider_id
    r = session.get(f"{API}/providers/{pid}", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["display_name"] == "TEST_Mila"
    assert data["location"]["country"] == "Belgium"
    c = data.get("characteristics") or {}
    assert c.get("breast_size") == "D", f"breast_size not persisted: {c}"
    assert c.get("breast_type") == "Enhanced", f"breast_type not persisted: {c}"
    assert c.get("ethnicity") == "European"
    assert c.get("tattoos") == "yes"
    assert data.get("contact", {}).get("telegramId") == "mila.brussels"
    assert data.get("contact", {}).get("hasTelegram") is True


def test_browse_still_loads(session):
    r = session.get(f"{API}/providers", timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_browse_filter_breast_type_enhanced(session):
    r = session.get(f"{API}/providers", params={"breast_type": "Enhanced"}, timeout=20)
    assert r.status_code == 200
    # No crash; may or may not have results — just assert structure
    assert isinstance(r.json(), list)
