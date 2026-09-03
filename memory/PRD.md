# Elegant Escort Marketplace - PRD

## Original Problem Statement
Build a modern, premium, and discreet escort marketplace platform focused on trust, privacy, elegance, and high-end user experience. Connects verified independent service providers with clients through location-based discovery and profile browsing.

## Design Requirements
- Desktop-first (1440px), responsive for tablet and mobile
- Luxurious but minimal, refined editorial aesthetic
- Soft premium color palette, high readability
- Modern card-based layout with subtle micro-interactions
- Tone: Discreet, premium, safe, trustworthy, elegant

## Tech Stack
- **Frontend:** React, Tailwind CSS, react-router-dom, Axios, Context API
- **Backend:** FastAPI, MongoDB (Motor async), Pydantic, JWT
- **Architecture:** Monorepo with `frontend` and `backend` services

## Database Schema
- **users:** `{username, email, password_hash, role, created_at}`
- **provider_profiles:** `{user_id, provider_id, display_name, age, gender, location:{city,country}, bio, essence, companionshipType, services (dict {name:{type,price}}), rates:{1hour,2hours,3hours,overnight} (floats), contact:{phone,whatsapp,email}, schedule:{day:{available,start,end}}, photos:[str], verified, verification_status, available, created_at}`

## CHANGELOG
### 2026-02 - Subscriptions / Paid Listings (Feb 24)
- **Pricing model:** providers must purchase a Featured Listing plan (€30/2 weeks or €55/4 weeks) to appear on `/browse`. Optional VIP Boost add-on (€15/2 weeks or €25/4 weeks) places the profile in the top row above standard listings with a gold "VIP" pill.
- **Backend:** new `subscriptions` / `payment_transactions` collections. Server-side `PLANS` allowlist enforces amounts (never trusts client). New routes: `POST /api/subscriptions/checkout`, `GET /api/subscriptions/status/{session_id}`, `GET /api/subscriptions/me`, `POST /api/webhook/stripe`. Plan kind validated ("featured" vs "vip"). Activation is idempotent: `_activate_subscription_for_session()` extends `featured_until`/`vip_until` from existing future expiry (additive top-up).
- `GET /api/providers` updated: subscription gate (`featured_until > now`) hides any provider without an active Featured plan, then sorts VIPs first by recency, then non-VIPs by created_at.
- Provider detail and Browse responses now include `featured_active` / `vip_active` flags.
- Grandfathered all 35 existing seeded providers with a free 30-day Featured plan; Sophia gets VIP for the demo so she appears first.
- **Frontend:** new `/subscribe` page (`Subscribe.js`) with two Featured radio cards, VIP toggle + add-on cards, live total summary, "Continue to payment" → Stripe Checkout. New `/payment-success` page (`PaymentSuccess.js`) polls `getSubscriptionStatus` every 2s up to 8 attempts (16s) before showing "Still processing" — handles the typical webhook-latency window after Stripe redirect.
- ProviderDashboard: new banner above the Verification banner — "Activate your profile · Choose a plan" CTA when no active sub, or "Featured · live · expires in N days" with Renew + Upgrade-to-VIP CTAs when active.
- Browse: gold "VIP" pill (top-left of card with crown icon) on profiles with `vip_active=true`.
- **Payment provider:** Stripe Checkout via `emergentintegrations.payments.stripe.checkout.StripeCheckout` (one-time payment under the hood, EUR currency). Test key `sk_test_emergent` already in backend `.env`. Visa/Mastercard/Amex/Apple Pay/Google Pay/PayPal/SEPA/iDEAL/Klarna all supported by Stripe Checkout.
- **Auto-renew:** currently one-shot purchase; the dashboard surfaces a 1-tap "Renew / extend" CTA. True Stripe Subscriptions (recurring auto-charge + customer portal) is a ~30-line backend swap pending the user's own Stripe key.
- **Verified:** backend 15/15 pytest cases pass; frontend 5/6 flows pass via testing agent (the polling-card fix landed in the same iteration).

### 2026-02 - Characteristic filters on Browse (Feb 23)
- Backend: extended `GET /api/providers` to accept all 15 physical-characteristic filters as query params: `nationality` (case-insensitive partial regex), `ethnicity`, `orientation`, `eye_color`, `hair_color`, `hair_length`, `breast_size`, `breast_type`, `pubic_hair`, `tattoos`, `piercings`, `smoker` (exact match on `characteristics.<field>`), `languages` (comma-separated, `$all` — provider must speak every requested language), and `min_height` / `max_height` / `min_weight` / `max_weight` numeric ranges.
- New helper `_add_numeric_range_expr()` uses `$expr` + `$toDouble` so range filters work even when height/weight were stored as strings (legacy data).
- Frontend: new `ExtraFilters.jsx` component renders 4 grouped sections (Pricing & service, Background, Physical, Lifestyle) with selects, multi-select language pills, range inputs, and yes/no toggles — all hidden behind the existing "Extra Filters" toggle button.
- Browse page now shows a gold count badge on the Extra Filters button reflecting the number of active filters (each language pill counts individually). "Clear all filters" link at the bottom of the panel resets every extra filter while preserving city + gender.
- Apply button at the bottom of the panel triggers fetch (separate from the gender pills, which still fetch immediately).
- Mobile: panel grids collapse to single-column on <md, language pills wrap to 2 columns.
- Verified via 31-test pytest suite at `/app/backend/tests/test_browse_filters.py` (100%) and 5 frontend re-tests via testing agent (100%). Service Worker cache version bumped to `lumiere-v6`.


**Provider side**
- New `VerificationModal.jsx` with 3 upload slots: ID front (required), selfie with ID (required), secondary document (optional). Image preview, 5 MB limit, base64 data URL upload.
- Provider Management Dashboard now shows a contextual banner at the top:
  - **Pending** (not submitted): gold gradient banner "Unlock the Verified badge" → opens modal
  - **Submitted**: neutral gold banner "Verification under review — email within 24 hours"
  - **Approved**: green "Profile verified — live on marketplace"
  - **Rejected**: red banner showing the admin's reason + "Resubmit documents" CTA
- Post-creation: after `POST /api/providers/profile`, the verification modal auto-opens with "Profile created — now let's verify your identity" toast.
- `GET /api/verification/status` now strips `document_url` (doesn't leak base64) and returns `rejection_reason`.

**Backend**
- `VerificationSubmit` model now accepts `{ id_front, id_selfie, secondary_doc? }` in one call; creates up to 3 pending `verification_documents` records and flips profile status to `submitted`.
- Re-submission after rejection: old pending/rejected docs are cleared automatically so the admin sees only the fresh set.
- `VerificationDecision` model: `{ status, reason? }` — `PUT /api/admin/verifications/:id` now takes JSON body (not query param).
- On decision: email sent via Resend with branded HTML — different copy for approved vs rejected (includes admin reason).
- Rejection stores `rejection_reason` on the provider profile so it shows in the dashboard banner until next resubmit.

**Admin side**
- Rebuilt `/admin/verifications` (`AdminPanel.js`):
  - Queue of submitted providers with name, email, city, doc count
  - Click **Review** → modal with 3 documents rendered side-by-side, click any image for lightbox zoom
  - **Approve** or **Reject with reason** (textarea required for rejection)
  - Both decisions trigger Resend email automatically
  - Empty state with CheckCircle icon when queue is clear
- Added **Verifications** link in Admin Dashboard header
- `GET /api/admin/verifications` now returns enriched payload with `user.email` + `user.name` for quick identification.

**Verified end-to-end via curl**
- Submit → status flips to submitted, 2 docs recorded ✅
- Admin queue lists the submission with docs + user info ✅
- Approve → `verified: true`, `verification_status: approved` ✅
- Reject with reason → status `rejected`, reason stored, email sent ✅
- Resubmit clears old docs cleanly ✅

### 2026-02 - Physical characteristics on provider profiles (Feb 22)
- Added 15 optional physical-characteristic fields to provider profiles: `nationality` (text), `ethnicity`, `orientation`, `height` (cm), `weight` (kg), `eye_color`, `hair_color`, `hair_length`, `breast_size`, `breast_type`, `pubic_hair`, `languages` (multi-select, max 4 from English/French/German/Russian), `tattoos` / `piercings` / `smoker` (yes/no toggles).
- Backend: extended `ProviderProfile*` Pydantic models with `characteristics: Optional[Dict[str, Any]]`.
- Frontend: new `CharacteristicsForm.jsx` component rendered below the "Describe Yourself" textarea inside the Basic Info step, with clear "Physical Characteristics" heading + divider. Full hydration, save (create + update), and clear of the characteristics dict.
- Public profile: new definition-list block below "My Essence" (same card), divider on top, 2-column grid (1-column on mobile). Only shows the rows that have values.
- All optional — providers can fill any subset.
- Seeded Sophia's profile with sample characteristics for the first UX review.

### 2026-02 - Forgot Password flow via Resend (Feb 22)
- Added `resend==2.29.0` to requirements and wired `RESEND_API_KEY` + `SENDER_EMAIL` env vars.
- Backend: `POST /api/auth/forgot-password` creates a `password_reset_tokens` doc (32-byte `secrets.token_urlsafe`, 24h expiry, single-use), sends branded HTML email via `resend.Emails.send` (offloaded to `asyncio.to_thread`). Always returns a neutral response — no email enumeration.
- Backend: `POST /api/auth/reset-password` validates token + expiry + `used` flag, requires ≥8 chars, updates `password_hash`, marks token used, invalidates existing sessions.
- Email template: inline-CSS HTML with Lumière brand (gold `#C6A87C` CTA on dark card, "Expires in 24 hours" note, fallback plain-text link).
- Frontend: new pages `ForgotPassword.js` (email form → "Check your email" success state) and `ResetPassword.js` (valid-token form, invalid-token state, success state with auto-redirect to `/login`). Both mirror the existing Login split-screen design and are mobile-responsive.
- Added routes `/forgot-password` + `/reset-password` in `App.js`.
- Sender currently uses Resend test sender (`onboarding@resend.dev`) — only delivers to the Resend account owner until a custom domain is verified.
- Verified end-to-end: neutral response for non-existent users, short-password rejection, bad-token rejection, successful reset → login with new password works, old password no longer works, used tokens rejected on replay.

### 2026-02 - PWA & Add-to-Home-Screen (Feb 21)
- Installed PWA: added `/app/frontend/public/manifest.json` (standalone display, Lumière branding, theme `#0A0A0C`), generated icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png` 180×180, `favicon-32.png`) via Python PIL with gold `L` monogram on dark bg.
- Updated `public/index.html`: title → "Lumière", theme-color → `#0A0A0C`, viewport-fit `cover`, apple-mobile-web-app-capable, apple-mobile-web-app-title, manifest link, apple-touch-icon.
- Service worker (`public/sw.js`) registered in `src/index.js` (skipped inside iframes):
  - Install pre-caches shell (`/`, `/browse`, `/manifest.json`)
  - Navigations → network-first with cache fallback
  - `/static/*` + JS/CSS/fonts → cache-first so app shell boots offline
  - `GET /api/providers/{id}` → stale-while-revalidate
  - Images → cache-first with runtime caching
- Created `AddToHomeScreen.jsx` (mounted in `App.js`):
  - Detects iOS Safari → instructional bottom sheet ("Tap Share → Add to Home Screen"), shows after 8s
  - Android/Chrome → listens for `beforeinstallprompt`, renders "Install" button that calls native prompt, shows after 6s
  - Session-dismiss (`sessionStorage`) or "Don't show again" (`localStorage`)
  - Hidden when app is already standalone, and inside Emergent preview iframe
  - Honors `env(safe-area-inset-bottom)` so it clears iPhone home indicator
- Recently-viewed tracking on ProviderDetail: stores last 10 visited providers in `localStorage`. Browse page falls back to this cache when offline and shows a gold banner "You're offline — showing profiles you've recently viewed".
- Verified end-to-end: at 390×844 iPhone UA, iOS A2HS sheet renders correctly; with SW active, offline navigation to `/browse` serves full React shell with cached Sophia profile card.

### 2026-02 - Mobile responsive pass (Feb 21)
- Created `/app/frontend/src/components/SiteHeader.jsx` — reusable responsive header with built-in hamburger menu (`md:` breakpoint). Wired into Landing and Browse.
- Browse page: gender filter buttons now wrap (`flex-wrap`) with smaller mobile padding; "Extra Filters" label hidden below `sm` (icon-only); search input + Search CTA stack vertically on mobile.
- ProviderDetail: reduced hero padding (`pt-24 md:pt-32`), gap (`gap-8 lg:gap-16`), header name (`text-4xl md:text-5xl`), card padding (`p-6 md:p-8`), with proper flex `shrink-0`/`min-w-0` to prevent overflow between name and verified badge.
- Landing hero: title now scales `text-5xl sm:text-6xl lg:text-7xl`; subtitle scales `text-base md:text-xl`. Footer stacks copyright + legal links vertically on small screens.
- Dialog component: changed default width from `w-full max-w-lg` to `w-[calc(100vw-2rem)] max-w-lg` — every dialog (age verification, etc.) now has 1rem side margin on mobile.

### 2026-02 - Booking system fully removed (Feb 21)
- Deleted `/app/frontend/src/pages/Bookings.js` and `BookingSuccess.js`
- Removed routes `/bookings` and `/booking-success` from `App.js`
- Removed booking/payment/review API helpers from `services/api.js`
- Removed `Bookings` nav link from ProviderDashboard, Messages, ClientDashboard
- Removed dead `<Dialog>` booking modal + `handleBooking` + `bookingData` state from `ProviderDetail.js`
- Simplified ClientDashboard to two cards: Discover + Messages (removed Recent Bookings section, stats card, `getBookings` call)
- Backend: removed `Booking`, `BookingCreate`, `Review`, `ReviewCreate`, `PaymentCheckout` models; removed `/bookings`, `/bookings/{id}`, `/reviews`, `/providers/{id}/reviews`, `/payments/checkout`, `/payments/status/{sid}`, `/webhook/stripe` routes
- Removed `emergentintegrations.payments.stripe.checkout` import and `STRIPE_API_KEY` config
- Simplified provider dashboard stats to only return `unread_messages`
- Removed reviews enrichment from `GET /providers/{id}`
- Removed `total_bookings` from admin stats; swapped Admin Dashboard's Bookings stat tile to "Pending Media"
- Dropped legacy MongoDB collections: `bookings`, `reviews`, `payment_transactions`
- Clients now connect with providers exclusively through: (a) contact buttons on provider profile — Phone / WhatsApp / Telegram / Email (already present via "Let's connect" block), and (b) internal messaging inbox.

### 2026-02 - Provider Management Dashboard (Feb 21)
- Built management dashboard replacing the wizard view once a profile exists.
- 5 section cards (Basic Info / Photos & Videos / Services / Rates / Availability) each with an Edit button.
- Clicking Edit opens that exact step of the profile form with data pre-populated; Cancel / Save Changes replaces the Next/Previous buttons.
- `fetchDashboard` now hydrates `profileData` from the server response and normalizes legacy schema (services list → inclusive dict, `rates.hourly` → `rates.1hour`, default schedule for profiles without one).
- Photos step now shows existing saved photos with a remove (x) button on hover, in addition to the file-upload drop zone.
- Sophia set up as the primary demo (`provider1@lumiere.com` / `sophia123`, provider_024900f536dd). Duplicate user records with the same email were deduped.

### 2026-02 - Provider Dashboard ↔ Backend integration (Feb 21)
- Expanded Pydantic models (`ProviderProfile`, `ProviderProfileCreate`, `ProviderProfileUpdate`) to accept rich nested schema (services dict, rates dict with string values, contact, schedule, essence, companionshipType, photos)
- Added `_normalize_rates()` helper to cast rate values to floats on save (empty strings skipped)
- Updated browse filter to use `rates.1hour` instead of `rates.hourly`
- Updated booking amount calculation to read `1hour` rate with safe float conversion
- Frontend `handleCreateProfile` now uses `PUT /providers/profile` when profile exists, `POST` otherwise
- Fixed CSS overlap bug: Currency (€) sign overlapping input value in Provider Dashboard Rates step and Services extra price field. Root cause: `.input-premium { @apply px-4 }` in App.css loaded after Tailwind utilities, overriding `pl-12`. Fixed with `!pl-10` / `!pl-7 !pr-2` important modifiers.

## Test Credentials
- **Provider:** `testprovider@example.com` / `password123`
- **Client:** `testclient@example.com` / `password123`

---

## Implemented Features

### March 25, 2026
- **Admin Dashboard:**
  - Stats cards (providers, clients, pending media, bookings)
  - Traffic analytics with daily chart and top pages
  - Providers table with action-needed prioritization
  - Provider detail page for media approval/rejection
  - Verify/unverify provider functionality
- **Home Page Updates:**
  - Centered hero banner content (title, subtitle, CTAs)
  - Added 18+ age verification modal (localStorage remembers confirmation)
  - Added "Latest Profiles" section: 18 profiles in 3 rows x 6 columns
  - Profiles overlay hero background, CTAs below profiles
- **Profile Page Updates:**
  - Changed location line to "Luxury companion based in [City]"
  - Added age beside provider name (e.g., "Sophia, 21")
  - Swapped "My schedule" and "Time & investment" blocks
  - Added "Extra Requests" block (350 char limit + Send CTA - MOCKED)
  - Removed "Book Now" button

### Previous Session
- Full-stack app setup (FastAPI + React + MongoDB)
- JWT authentication for clients and providers
- Profile browsing with 6-column grid and gender filters
- Provider Detail page with carousel, thumbnails, services, rates, schedule
- Provider registration flow
- Database seeding with 30 sample profiles
- Standardized form UI across all auth pages
- Provider Dashboard (stats removed per user request)

---

## Pending Issues

### P0 - Critical
1. **Provider Login Serialization Bug**
   - Error: `TypeError: Object of type datetime is not JSON serializable`
   - Fix applied in `/api/auth/login` and `/api/auth/register` endpoints
   - Status: Needs verification

### P1 - High
2. **Frontend Preview Service**
   - Screenshot tool occasionally shows blank pages
   - Workaround: Use curl + compilation logs

---

## Roadmap

### P0 - Must Have
- [ ] Verify provider login fix
- [ ] Booking System (end-to-end flow)

### P1 - Should Have
- [ ] Messaging System (connect Extra Requests to backend)
- [ ] Provider Profile Editing from dashboard
- [ ] Payment Integration

### P2 - Nice to Have
- [ ] Admin Panel functionality
- [ ] Real-time notifications
- [ ] Review system

---

## API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/providers`
- `GET /api/providers/{provider_id}`
- `GET /api/providers/dashboard`

## Key Files
- `/app/backend/server.py` - All backend logic
- `/app/frontend/src/pages/ProviderDetail.js` - Provider profile page
- `/app/frontend/src/pages/Browse.js` - Discovery page
- `/app/scripts/seed.py` - Database seeding

## Mocked Features
- "My schedule" section (static data)
- "Extra Requests" Send button (simulates success)
- Booking modal (UI only, no backend integration)
- Messages page (placeholder)

---

## Changelog

### Feb 11, 2026 — Website Copy Extraction
- Executed `/app/scripts/extract_website_copy.py` to produce a full audit of user-facing text.
- Output files (459 distinct strings, grouped by source file):
  - `/app/frontend/public/only-elite-escorts-copy.docx`
  - `/app/frontend/public/only-elite-escorts-copy.xlsx`
- Publicly downloadable at:
  - `${REACT_APP_BACKEND_URL}/only-elite-escorts-copy.docx`
  - `${REACT_APP_BACKEND_URL}/only-elite-escorts-copy.xlsx`

2026-08-23: Rebranded site name from 'Only Elite Escorts' to 'Elite Escorts Europe' across frontend (header, landing, register, PWA manifest, index.html), backend (emails, invoice PDFs), and scripts. SW bumped to v61.
2026-08-23: Removed PWA install functionality — deleted AddToHomeScreen install banner, removed manifest link & iOS PWA meta tags from index.html, service worker now unregisters on load.
2026-09-01: Fixed webpack compile error in carousel.jsx — root cause was a null parentPath crash in plugins/visual-edits/babel-metadata-plugin.js lazyEvaluatePropSource; added null-safe rootPath guard. Verified by testing agent (iteration_5, 100% pass).
2026-09-01: Advertise register step 1 — removed 'Full name' field and 'Register as a client' link; added Independent/Agency selection buttons (choice carries into dashboard profile via pending_account_type localStorage; name derived from email prefix).
2026-09-01: BUG FIX — dashboard 'Activate your profile' banner disappeared after returning unpaid from /subscribe. Root cause: banner gated behind {subscription && ...}; a silently failed getMySubscription hid it. Now banner renders unconditionally, defaulting to the activate prompt unless featured_active. Verified by testing agent (iteration_6, 100% pass incl. paid-provider regression).
2026-09-03: FEATURE — Agency Accounts (multi-profile management). Agencies pick "Agency" at /register/provider (account_type now stored on the user doc & returned by register/login/me). DashboardRouter renders new AgencyDashboard.js (roster TABLE: name, description, location, live/verification status pills, unread badge, Edit + Delete, "Add profile" + empty-state; 3-stat strip). Edit → /dashboard/profile/:providerId opens the existing ProviderDashboard scoped to that profile via useParams; Add → /dashboard/profile/new (create flow → navigates to the new profile). Backend: new GET /api/agency/profiles; _resolve_owned_profile(current_user, provider_id) helper validates per-user ownership; POST /api/providers/profile now allows multiple profiles ONLY for account_type=='agency' (independents still 400 on 2nd); PUT/DELETE /providers/profile, GET /providers/dashboard/stats, GET /subscriptions/me, PUT /subscriptions/auto-renew, GET /enquiries/mine (separate inbox per profile), GET /invoices/mine, POST /verification/submit, GET /verification/status all accept optional provider_id query param. Each profile paid/verified separately (per user choices). Subscribe.js reads ?provider_id. Delete of a scoped agency profile returns to roster (no logout). Verified by testing agent (iteration_7): frontend 100%, backend 8/9 (1 skip), ownership isolation confirmed, independent path unchanged.
2026-09-03: FEATURE — Agency onboarding wizard + bulk activation ("Finish & pay"). New agencies complete a 3-step setup wizard (AgencyOnboarding.js: Basic info [agency name/city/country/description/languages] + Contact → Services [+ "apply to all profiles" checkbox with info bullet] → Rates & availability) saving an agency MASTER PROFILE (agency_profiles collection) used as defaults for every companion profile. Extracted shared step UIs into components/onboarding/ServicesStep.jsx + RatesAvailabilityStep.jsx and constants/companionData.js. AgencyDashboard has an onboarding gate (getAgencyProfile.onboarded). Each roster row has a per-profile plan dropdown (agency pricing: Featured €30/2wk or €50/4wk) + optional VIP add-on (vip_2w €15 / vip_4w €25) persisted via PUT /api/agency/profiles/{id}/plan (pending_plan). Sticky "Finish & pay" bar sums queued profiles → ONE bulk Stripe checkout (POST /api/subscriptions/checkout-bulk, server re-derives totals from PLANS); _activate_subscription_for_session is bulk-aware (provider_plans) and publishes every profile on payment, clearing pending_plan. Agency profile-create flow drops the "Activate" step (4 steps, "Save profile" → back to roster; services/rates prefilled from agency defaults). Independents unchanged (€30/€55, 5-step). Backend adds PLANS.agency_featured_2w(€30/14d)/agency_featured_4w(€50/28d). Verified by testing agent (iteration_8): backend 9/9, frontend 100%, independent regression intact.
