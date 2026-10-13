"""Tests for GET /api/providers browse filters, especially physical characteristic filters."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
PROVIDERS_URL = f"{BASE_URL}/api/providers"
SOPHIA_ID = "provider_024900f536dd"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _ids(profiles):
    return {p["provider_id"] for p in profiles}


def _get(client, **params):
    r = client.get(PROVIDERS_URL, params=params, timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert isinstance(data, list)
    return data


# ---- Baseline sanity ----
class TestBaseline:
    def test_sophia_visible_by_default(self, client):
        data = _get(client)
        assert SOPHIA_ID in _ids(data), "Sophia should be returned without filters (verified + available)"


# ---- Nationality (regex, case-insensitive) ----
class TestNationality:
    def test_nationality_partial_lowercase(self, client):
        data = _get(client, nationality="fren")
        ids = _ids(data)
        assert SOPHIA_ID in ids
        # All returned must have a nationality containing "fren" case-insensitively
        for p in data:
            nat = (p.get("characteristics") or {}).get("nationality", "")
            assert "fren" in nat.lower(), f"Unexpected nationality {nat!r}"

    def test_nationality_full_match_case_insensitive(self, client):
        data = _get(client, nationality="FRENCH")
        assert SOPHIA_ID in _ids(data)

    def test_nationality_no_match(self, client):
        data = _get(client, nationality="xyz_no_such")
        assert SOPHIA_ID not in _ids(data)


# ---- Languages ($all) ----
class TestLanguages:
    def test_languages_single(self, client):
        data = _get(client, languages="French")
        assert SOPHIA_ID in _ids(data)

    def test_languages_all_must_match(self, client):
        data = _get(client, languages="English,French")
        assert SOPHIA_ID in _ids(data)

    def test_languages_requires_all_excludes_missing(self, client):
        # Sophia speaks English/French/German — not Russian
        data = _get(client, languages="English,Russian")
        assert SOPHIA_ID not in _ids(data)

    def test_languages_three(self, client):
        data = _get(client, languages="English,French,German")
        assert SOPHIA_ID in _ids(data)


# ---- Numeric ranges on string-stored fields ----
class TestHeightWeightRanges:
    def test_height_in_range_includes_sophia(self, client):
        data = _get(client, min_height=160, max_height=180)
        assert SOPHIA_ID in _ids(data)

    def test_height_above_range_excludes_sophia(self, client):
        data = _get(client, min_height=180)
        assert SOPHIA_ID not in _ids(data)

    def test_height_below_range_excludes_sophia(self, client):
        data = _get(client, max_height=160)
        assert SOPHIA_ID not in _ids(data)

    def test_weight_in_range_includes_sophia(self, client):
        data = _get(client, min_weight=50, max_weight=70)
        assert SOPHIA_ID in _ids(data)

    def test_weight_above_range_excludes_sophia(self, client):
        data = _get(client, min_weight=70)
        assert SOPHIA_ID not in _ids(data)


# ---- Categorical equality ----
class TestCategorical:
    @pytest.mark.parametrize("key,matching,non_matching", [
        ("hair_color", "Brunette", "Blonde"),
        ("eye_color", "Green", "Blue"),
        ("hair_length", "Long", "Short"),
        ("breast_size", "C", "A"),
        ("breast_type", "Natural", "Enhanced"),
        ("pubic_hair", "Trimmed", "Shaved"),
        ("ethnicity", "European", "Asian"),
        ("orientation", "Straight", "Bisexual"),
    ])
    def test_equality_filter(self, client, key, matching, non_matching):
        d_match = _get(client, **{key: matching})
        assert SOPHIA_ID in _ids(d_match), f"{key}={matching} should include Sophia"
        d_no = _get(client, **{key: non_matching})
        assert SOPHIA_ID not in _ids(d_no), f"{key}={non_matching} should exclude Sophia"


# ---- Yes/No toggles ----
class TestYesNo:
    @pytest.mark.parametrize("key,match_val,no_match_val", [
        ("tattoos", "no", "yes"),
        ("piercings", "yes", "no"),
        ("smoker", "no", "yes"),
    ])
    def test_yes_no(self, client, key, match_val, no_match_val):
        assert SOPHIA_ID in _ids(_get(client, **{key: match_val}))
        assert SOPHIA_ID not in _ids(_get(client, **{key: no_match_val}))


# ---- Composition with existing filters ----
class TestCompose:
    def test_combined_ethnicity_and_orientation(self, client):
        data = _get(client, ethnicity="European", orientation="Straight")
        assert SOPHIA_ID in _ids(data)

    def test_combined_hair_and_language_and_range(self, client):
        data = _get(client, hair_color="Brunette", languages="English,French",
                    min_height=160, max_height=180, tattoos="no")
        assert SOPHIA_ID in _ids(data)

    def test_combined_with_existing_gender(self, client):
        # Stored gender is lowercase 'female' (what the frontend pills send)
        data = _get(client, gender="female", hair_color="Brunette")
        assert SOPHIA_ID in _ids(data)

    def test_combined_with_existing_city(self, client):
        data = _get(client, city="New York", hair_color="Brunette")
        assert SOPHIA_ID in _ids(data)

    def test_combined_gender_excludes(self, client):
        data = _get(client, gender="male", hair_color="Brunette")
        assert SOPHIA_ID not in _ids(data)


# ---- Regression on existing filters ----
class TestRegression:
    def test_no_params_still_returns_list(self, client):
        data = _get(client)
        assert len(data) > 0

    def test_provider_detail_still_works(self, client):
        r = client.get(f"{BASE_URL}/api/providers/{SOPHIA_ID}", timeout=30)
        assert r.status_code == 200
        profile = r.json()
        chars = profile.get("characteristics", {})
        assert chars.get("hair_color") == "Brunette"
        assert chars.get("nationality") == "French"
        assert "French" in chars.get("languages", [])
