# Elite Escorts Europe — PRD

## Product
A modern, premium, discreet escort marketplace connecting verified independent providers and agencies with clients directly. Desktop-first, responsive, luxurious-but-minimal, card-based. Light Rose/Wine theme. Tone: premium, safe, trustworthy, elegant.

## Monetization
Providers pay to list via Subscriptions (Featured listing + optional VIP boost). Agencies manage multiple companion profiles from one login, set agency-wide default rates/services, pay in bulk.

## Stack
- Frontend: React + Tailwind CSS
- Backend: FastAPI + MongoDB (Motor) + Pydantic
- Integrations: Stripe (payments), Resend (email), ipgeolocation.io (IP geo-sort), Google Sign-in (Emergent-managed)

## Theme tokens
- Primary/CTA & headings: `#DA4167`
- Secondary: `#832161`
- Borders: `#dbdadd`
- Selected (wizard/filters): `bg-[#832161]/5` with `#832161` border

## Credentials
See `/app/memory/test_credentials.md`.

## Key API endpoints
- `GET /api/providers` — browse/search. Geo-sorts: VIP first (closest), then non-VIP (closest). Visitor coords from IP (ipgeolocation.io) OR from `origin_city`/`origin_country` query params (manual override, takes precedence over IP). Distances NOT shown on frontend.
- `POST /api/reports` — fake-profile report with attachments.
- `GET /api/auth/verify-email?token=` — idempotent email confirmation.
- `POST /api/auth/resend-verification`.

## DB schema (key)
- `users`: {email, password_hash, role, account_type, email_verified}
- `provider_profiles`: {user_id, agency_id, accepts_disabilities, location:{city, country, lat, lng}, ...}
- `reports`: {provider_id, reporter_name, reporter_email, description, attachments, created_at}

## Implemented (recent)
- 2026-06: **Provider onboarding Step 1 redesign** — extracted step 1 into `components/onboarding/BasicInfoStep.jsx` (3 light cards: Basic information, Contact information, Physical characteristics). New shared header ("Step X of 5 · About 6 minutes left", "Complete your profile", functional **Draft saved** indicator + **Save & exit**), numbered horizontal stepper, and standalone action-bar footer ("…optional." helper + "Save & continue"). Added functional draft autosave (debounced PUT once a draft exists; explicit Save & continue creates on first save, no duplicates). Rewrote `CharacteristicsForm.jsx` with real **Breast size** (A/B/C/D/DD+) and **Breast type** (Natural/Enhanced) fields, plus ethnicity pills, cm/kg inputs, Yes/No segmented toggles. `ExtraFilters` breast_type options updated to Natural/Enhanced. Verified end-to-end by testing agent (backend 7/7, frontend 100%, iteration_17).
- 2026-06: **Manual Location Override on Browse** — `origin_city`/`origin_country` params override IP-based geo-sort; frontend `/browse` has a "Showing results nearest to [city ▼]" dropdown (28 EU cities + Auto-detect), persisted in localStorage (`ee-origin-city`). Verified desktop + mobile.
- Browse search box + SEARCH button width now matches the filter buttons row (shared `w-fit` wrapper).
- IP-based geo-sorting (ipgeolocation.io + Haversine + Nominatim geocode).
- Email verification for manual signups, banners, idempotent endpoint.
- Fake-profile report modal + backend.
- Static pages: /terms, /advertising-prices. Admin login page /admin/login.
- "Accepts people with disabilities" onboarding option (independent + agency cascade).
- Google Sign-in (Emergent-managed).

## Known issues / mocked
- Resend emails deliver only to account owner until `eliteescortseurope.eu` is domain-verified (BLOCKED on user).
- Provider photos & verification IDs stored as Base64 in Mongo — needs Emergent Object Storage migration.
- Stripe is one-time simulated checkout; true recurring billing pending live keys.

## Backlog (prioritized)
- P0: Refactor `server.py` (~3000 lines) into /routes, /models, /services.
- P0: Refactor `ProviderDashboard.js` (~3000 lines) into sub-components.
- P1: Cloud storage migration for media (Object Storage).
- P1: Admin Reports tab (review evidence, resolve reports).
- P1: Resend production domain verification.
- P2: Admin providers management (suspend/force-verify/toggle Featured/VIP).
- P2: Admin clients/users tab (search/suspend/delete).
- P2: Agency impersonation ("view as agency").
- P2: True Stripe auto-renew.
- P2: Admin header link visibility (only when admin signed in).
- P2: Browse filter — accepts-disabilities toggle + "within X km" distance slider.
- P2: Sort toggle on Browse (Nearest / Newest / VIP).
