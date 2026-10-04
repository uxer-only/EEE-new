# Elite Escorts Europe — PRD

## Product
A modern, premium, discreet escort marketplace connecting verified independent providers and agencies with clients directly. Desktop-first, responsive, luxurious-but-minimal, card-based. Light Rose/Wine theme. Tone: premium, safe, trustworthy, elegant.

## Monetization
Providers pay to list via Subscriptions (Featured listing + optional VIP boost). Agencies manage multiple companion profiles from one login, set agency-wide default rates/services, pay in bulk.

## Stack
- Frontend: React + Tailwind CSS
- Backend: FastAPI + MongoDB (Motor) + Pydantic
- Integrations: Stripe (payments), Resend (email), ipgeolocation.io (IP geo-sort), Google Sign-in (Emergent-managed)

## Theme tokens (updated 2026-06 to match design mockup)
- Primary/CTA & headings (wine): `#7A2357` (hover `#5C1A41`)
- Crimson accent (primary buttons, "Required", focus ring rgba(122,35,87,.14)): `#A3243B` (hover `#7A1A2E`)
- Primary text: `#1B1820`; secondary text: `#5F5966`; muted/placeholder: `#BDB4C5`
- Borders: `#DFDAE4`; card border: `#ECE8EF`; surfaces: `#F5F2F7` / `#F7F5F9`
- Card shadow: `0 6px 20px rgba(52,24,60,0.06)`
- Font: Manrope (300–800)
- Selected (filters/pills): `bg-[#7A2357]/5` with `#7A2357` border
- (Legacy `#832161`/`#DA4167` fully migrated to `#7A2357`/`#A3243B` across all files.)

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
- 2026-06: **Services step spacing** — in `ServicesStep.jsx`, added 8px gaps between the 6 service-category accordions (Massage, Companionship & role-play, Intimate, Couples & groups, Photos & filming, Fetish & BDSM) and a 32px gap between the companionship cards (Escort/Erotic massage) and the "Welcoming to clients with disabilities" block. **Key fix:** replaced `space-y-*` with `flex flex-col gap-*`. Reason: the preview dev-server's visual-edits Babel plugin wraps conditional/mapped JSX in inline `<span>`s, and inline elements ignore vertical margins, so `space-y-*` (sibling-margin) collapses to 0px in the preview (works fine in production where the plugin is off). `flex`+`gap` blockifies the spans so spacing is identical in both. **IMPORTANT for future spacing work: prefer `flex flex-col gap-*` over `space-y-*` for vertical spacing of conditional/mapped children.**
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
