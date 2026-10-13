# Elite Escorts Europe: redesign handoff

This folder is the existing EEE code base (the copy from 7 October) with the new design built in. Every screen on the design canvas, rows 1 to 7, is now a working page. The original code in `EEE-main` was not changed.

## What a developer needs to know first

- **Stack:**
  - **Public pages** (Home, Browse, profiles, plans, contact, terms) are a **Next.js** app in `web/`. The server renders them, so search engines get the full content.
  - **Everything else** (log in, register, dashboards, admin, inbox, payment result) is still the React app in `frontend/` (CRA + craco, react-router). Next.js serves its build for those addresses.
  - The backend is FastAPI with MongoDB (motor).
  - See "Next.js for the public pages" below.
- **Git:** the history is kept. The redesign is in the last commits on the current branch. Nothing has been pushed.
- **Try it locally:** on a Mac, double-click `Start demo.command`; elsewhere run `bash demo/run_demo.sh`. It downloads what it needs into `.demo-tools/` (Python through uv, and Node.js if missing), builds both apps and starts the backend on port 8001 and the site on <http://localhost:3000>, with an in-memory database and demo data. The browser opens by itself. All demo passwords are `demo1234`.

  | Role | Account |
  |---|---|
  | Independent (live) | `isabella.indep@demo.com`, `chloé.indep@demo.com` |
| Independent with media, ID and custom services to review | `mia.indep@demo.com` |
  | New independent, no profile yet | `new.indep@demo.com` |
  | Agency | `rosenoire.agency@demo.com` |
  | New agency, not set up yet | `new.agency@demo.com` |
  | Admin | `admin@demo.com` (log in at `/admin/login`) |

  The demo is for previews only. Production needs:
  - **Backend:** MongoDB and `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `APP_URL` (the site's public address), `CORS_ORIGINS`, `RESEND_API_KEY`, `SENDER_EMAIL`, `STRIPE_API_KEY`, `UPLOAD_DIR`, `REPORT_EMAIL` and `IPGEOLOCATION_API_KEY`.
  - **Site (`web/`):** `API_URL` (the backend's own address, for example `http://localhost:8001`) and `SITE_URL` (the public address, for example `https://www.eliteescortseurope.com`). Set both when building and when running.

## Design system in code

- `src/styles/site.css` and `public.css` are shared: the Next.js pages import them from `frontend/src/styles`, so both apps always look the same. `site.css` holds the colour tokens (`--x-*`, with a gutter of 120 / 48 / 16 px), the page frames, the header and footer, the buttons, the glass cards and the age check.
- `src/components/site/Shell.jsx` provides the page frames: `PublicPage` (dark pages with a photo or glow background) and `LightPage` (light pages). It also has the site navigation, which includes an admin variant, and the footer.
- `src/components/site/Form.jsx` has the form building blocks: cards, fields, segmented controls, pills, switches, the stepper, the info note and the error summary.
- CSS files by area:

  | File | Area |
  |---|---|
  | `public.css` | Home, Browse, plans, contact, terms, payment result |
  | `web/styles/profile.css` | Profile page (Next.js only) |
  | `auth.css` | Log in and register |
  | `advertiser.css` | Advertiser forms |
  | `dashboard.css` | Dashboards and inbox |
  | `admin.css` | Admin |

- **CSS class names:** CRA bundles all CSS globally, so short class names collide across pages. Keep new classes prefixed. Several real collisions were found and fixed this way, for example `.req`, `.media`, `.msg`, `.vf` and `.adm`.

## Pages by design row

1. **Public pages** (Next.js, `web/app/`):
   - Home: `page.js`.
   - Browse: `browse/page.js` and `browse/BrowseClient.jsx`, with `components/ExtraFilters.jsx`. Includes "close to me" with reverse geocoding.
   - Profile page: `providers/[id]/page.js` and `ProfileClient.jsx`. Includes the gallery with videos, the lightbox, the request form and the report dialog.
   - Advertisement plans, Contact, and Terms & Privacy: `advertising-prices/`, `contact/`, `terms/`.
2. **Accounts:** Log in, Register as advertiser, Verify e-mail, Forgot password and Reset password.
3. **Independent onboarding:** `pages/advertiser/ProfileWizard.jsx`, five steps.
   - The profile is created when step 1 is saved, so photos can be uploaded straight away.
   - After that it saves automatically.
   - Step 5 picks a plan and starts checkout.
4. **Independent dashboard:**
   - `IndependentDashboard.jsx` shows status, messages, invoices, verification and the five profile sections.
   - `EditSection.jsx` edits one section per page.
   - `ChangePlan.jsx` extends or upgrades the plan.
   - `Messages.js` is the inbox. Replies are sent by e-mail, and the advertiser's own e-mail address stays private.
   - `PaymentSuccess.js` is the payment result page.
5. **Agency setup and dashboard:**
   - `AgencySetup.jsx` is a three-step setup. The agency defaults become the starting point for every new companion.
   - `AgencyDashboard.jsx` shows the companion table with one plan per profile, the price grade, the "Activate here" bulk checkout, the agency defaults and Sync defaults.
   - On phones the table becomes compact cards that expand.
6. **Agency companions:**
   - `CompanionWizard.jsx` adds a companion in four steps, pre-filled from the agency defaults.
   - `AgencyCompanion.jsx` is the companion's profile page.
   - Companion edit pages reuse `EditSection` with "her" wording.
   - `AgencyDefaultsEdit.jsx` edits the defaults.
7. **Admin** (`pages/admin/`):
   - Log in, Overview (stats, verification list and traffic chart), Independents (filters, search and paging).
   - The advertiser detail page reviews media and verifies ID. The same page serves independents and agency companions.
   - Agencies: expand to see companions, suspend, reactivate and delete.
   - The verification queue has Pending, Approved and Rejected tabs, with an inline rejection reason.

## Routes added or changed

| Route | Page |
|---|---|
| `/dashboard` | Independent: wizard or dashboard. Agency: setup or dashboard. Admin: goes to `/admin`. Client accounts: go to `/browse`. |
| `/dashboard/edit/:section` | Independent edit pages: `basic`, `photos`, `services`, `rates` |
| `/dashboard/plan` | Extend or upgrade the plan. `/subscribe` now redirects here. |
| `/dashboard/defaults/:section` | Agency defaults: `basic`, `services`, `availability`, `rates` |
| `/dashboard/companion/new` | Add a companion |
| `/dashboard/companion/:id` and `/dashboard/companion/:id/edit/:section` | Companion profile and its edit pages |
| `/dashboard/profile/:id` (old link) | Redirects to the companion pages |
| `/admin`, `/admin/independents`, `/admin/providers/:id`, `/admin/agencies`, `/admin/verifications` | Admin |

The old screens were removed:

- `LegacyProviderDashboard`, the old `AgencyDashboard` and `AgencyOnboarding`.
- The old admin pages, `Register`, `Subscribe` and `ClientDashboard`.
- `SiteHeader` and `SiteFooter`.

## Backend changes (`backend/server.py`)

- **Media:**
  - Upload, serve, delete and reorder through these endpoints:
    - `POST /api/providers/media`
    - `GET /api/media/files/{name}`
    - `DELETE /api/providers/media/{id}`
    - `PUT /api/providers/media/order`
  - Files go to `UPLOAD_DIR`, with a limit of 10 MB per file.
  - Approved videos are returned on the public profile.
- **Other new or changed endpoints:**
  - `GET /api/geo/reverse` is the reverse geocoder for "close to me". It uses Nominatim and caches the results.
  - `worldwide_travel` was added to profiles and agency defaults, and Sync defaults also copies it.
  - Rates keep the currency.
  - The label "VIP Boost" is now "VIP".
- **Enquiries:**
  - The inbox list includes the profile name.
  - Times are returned as UTC.
  - A reply's Reply-To is only the public contact e-mail.
- **Payment status** returns the list of agency profiles that were paid for. The success page uses it.
- **Admin endpoints:**
  - Stats now include the independent and agency splits and the verification counts.
  - The verification queue can be filtered by status and shows the agency name.
  - The provider list and detail include plan and visibility, owner type, agency name and verification documents.
  - The agency roster includes age and verification status.
- **E-mails:**
  - Rejecting a photo or video now e-mails the reason to the account holder. For a companion, that is the agency.
  - The old "Lumière" branding in the password reset and verification e-mails was replaced with Elite Escorts Europe.

## Second round (feedback)

- **Google log-in removed.** The Emergent-hosted Google sign-in, its callback page and the `/api/auth/session` endpoint are gone. Log-in and registration are e-mail and password only.
- **Custom services are reviewed by an admin.**
  - A service an advertiser adds is saved with `review: "pending"`. Only an admin can approve it; the review state sent by the browser is ignored.
  - Visitors only see approved custom services (profile page and Browse).
  - The admin advertiser page has a **Custom services** section with Approve and Reject. Reject removes the service, keeps a record in `rejected_services` and e-mails the reason.
  - Endpoint: `PUT /api/admin/providers/{id}/services/review`.
  - Advertisers see an "In review" tag in the services editor and on their dashboard.
  - Pending services count as "action needed" in the admin overview and the Independents list.
- **Own page-view counter (no Google Analytics).**
  - Every page except admin pages sends one page view (`POST /api/track`).
  - No cookies and no IP address are stored. The IP is replaced by a scrambled code that changes every day.
  - Raw page views are kept 90 days, then turned into daily totals (`traffic_daily`) and deleted. This runs every 6 hours with the renewal-notice job. Old rows that still held IP addresses are cleaned the same way.
  - The 10,000-row limit on the traffic report is gone.
  - Unique visitors are counted per day, because the code changes daily.
- **Privacy and cookie text updated** to match: no Google Analytics, no statistics cookies, what the counter stores and the 90-day limit.
- **Privacy fix:** the public profile no longer returns the advertiser's account e-mail address.
- **Emergent tooling removed:** the Emergent scripts in `index.html` (emergent-main.js and the visual-edit debug monitor) and the PostHog analytics snippet are gone. PostHog was Emergent's visitor tracking with session recording, which contradicted the privacy text. The Emergent build plugins (`frontend/plugins`), the `.emergent` folder and its Emergent git identity (`.gitconfig`) are removed too, and the tests now default to `http://localhost:8001`. The only Emergent dependency left is `emergentintegrations` for the Stripe checkout.
- **Fonts are served by the site itself.** Manrope and Playfair Display come from the `@fontsource` packages and are bundled with the frontend, so visitors' browsers no longer contact Google Fonts. The unused Inter font was dropped. The site now loads nothing from other domains.
- **Old Emergent notes removed:** the change notes, test reports, test accounts, the `memory` folder and the Emergent design brief. `README.md` now points to this file.

## Next.js for the public pages (third round)

- **Why:** the public pages are now rendered on the server. Search engines and link previews get the full page (profiles, photos, prices, text) instead of an empty page that needs JavaScript. The look is unchanged: every public page was compared pixel by pixel with the previous version, at desktop and phone width.
- **How the two apps fit together:**
  - `web/` (Next.js 16, App Router) answers every request on the site's address.
  - It forwards `/api/...` to the backend (`API_URL`), so the browser only talks to one domain and the log-in cookie works for both apps.
  - `npm run build:app` builds the React app with `PUBLIC_URL=/app` and copies it to `web/public/app`. Next.js serves it for the addresses in `APP_ROUTES` in `web/next.config.mjs` (log in, register, dashboard, admin, …). Add new React routes there.
  - In the React app, any other address (for example a link to `/browse`) loads the page from the Next.js site: `frontend/src/components/PublicSite.jsx`.
  - Production build: `cd web && npm ci && npm run build:all`, then `npm start` (port 3000). The React app needs `yarn install` in `frontend` first.
- **What each page does on the server and in the browser:**
  - The server fetches the data from the backend (`web/lib/server-api.js`) and renders the page. It passes the visitor's IP address to the backend, so "nearest first" sorting still works.
  - Filters, the gallery, "Show number", the request form, the report dialog, the age check and the header's log-in state run in the browser (files marked `'use client'`).
  - Browse keeps one shuffle order per visit: the server picks the seed and the filters reuse it.
- **SEO added:**
  - A title, description and canonical link for every page. Profiles get "Name, age – Elite escort in City" and their first photo as the preview image.
  - `/sitemap.xml` lists the public pages, every city with live profiles (`/browse?city=…`) and every live profile. `/robots.txt` keeps dashboards, admin and the API out.
  - Breadcrumb structured data on profiles; profiles whose plan ended are not indexed (`noindex`) but stay reachable by link.
  - A real 404 page for unknown addresses and removed profiles (before, the page redirected to Browse).
- **Smaller changes:**
  - The age check is rendered on the server; a small script hides it straight away for visitors who already confirmed.
  - Fonts are bundled (`@fontsource`); the site still loads nothing from other domains.
  - The old offline service worker is removed for visitors who still have it.
  - The demo's photos use relative addresses (`/demo/...`), and the demo backend no longer serves the React app.
- **Working on the React app alone:** `cd frontend && REACT_APP_BACKEND_URL=http://localhost:8001 REACT_APP_SITE_URL=http://localhost:3000 yarn start`, with the Next.js site running on port 3000 for the public pages.
- **Next steps for a full conversion:** move the remaining React pages into `web/app/` one area at a time (log in and register first, then the dashboards, then admin), remove each route from `APP_ROUTES`, and finally delete `frontend/`.

## Database

The code uses **MongoDB** (via `motor`). It is ready to connect: set `MONGO_URL` (for example a MongoDB Atlas connection string) and `DB_NAME`. Collections and indexes are created automatically on first use. A MySQL or PostgreSQL database would need the data layer rewritten.

## Known limitations and open decisions

1. **Payments still use Stripe** through the `emergentintegrations` package. Stripe is not usable for this business. A high-risk payment provider has to be integrated before launch. The checkout calls are in one place: `createSubscriptionCheckout`, `createBulkCheckout` and `/subscriptions/status`.
2. **`emergentintegrations`** is still used for the Stripe checkout only; it goes when the payment provider is replaced. Google log-in has been removed.
3. **Verification documents** are stored as base64 inside MongoDB. They should move to private object storage.
4. **Uploads are stored on the server's local disk** (`UPLOAD_DIR`). Production needs persistent storage or object storage.
5. **E-mails are only sent when `RESEND_API_KEY` is set.** Without it, replies and decisions are saved and the inbox says the e-mail was not sent.
6. **The "Show in Advertisers" link** from the Agencies design was left out, because it had no clear destination.
7. **The old automated tests** in `backend/tests` expect the original hosted environment and its accounts, so they fail locally. The redesign was instead checked end to end in a real browser for every flow:
   - Onboarding, uploads, plans and editing.
   - The inbox and replies.
   - Agency setup, companions, plans and sync.
   - Admin media and ID decisions, and suspending an agency.
   - Desktop (1440 px) and phone (390 px) layouts with no sideways scrolling.
