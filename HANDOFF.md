# Elite Escorts Europe: redesign handoff

This folder is the existing EEE code base (the copy from 7 October) with the new design built in. Every screen on the design canvas, rows 1 to 7, is now a working page. The original code in `EEE-main` was not changed.

## What a developer needs to know first

- **Stack:** the same as before. The frontend is React (CRA + craco, Tailwind available, react-router). The backend is FastAPI with MongoDB (motor). No new frameworks were added.
- **Git:** the history is kept. The redesign is in the last commits on the current branch. Nothing has been pushed.
- **Try it locally:** run `demo/run_demo.sh`. It installs the dependencies, builds the frontend and starts everything on <http://localhost:8001> with an in-memory database and demo data. All demo passwords are `demo1234`.

  | Role | Account |
  |---|---|
  | Independent (live) | `isabella.indep@demo.com`, `chloé.indep@demo.com` |
  | New independent, no profile yet | `new.indep@demo.com` |
  | Agency | `rosenoire.agency@demo.com` |
  | New agency, not set up yet | `new.agency@demo.com` |
  | Admin | `admin@demo.com` (log in at `/admin/login`) |

  The demo is for previews only. Production still needs MongoDB and the usual environment variables: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `APP_URL`, `CORS_ORIGINS`, `RESEND_API_KEY`, `SENDER_EMAIL`, `STRIPE_API_KEY`, `UPLOAD_DIR`, `REPORT_EMAIL` and `IPGEOLOCATION_API_KEY`.

## Design system in code

- `src/styles/site.css` holds the colour tokens (`--x-*`, with a gutter of 120 / 48 / 16 px), the page frames, the header and footer, the buttons, the glass cards and the age check.
- `src/components/site/Shell.jsx` provides the page frames: `PublicPage` (dark pages with a photo or glow background) and `LightPage` (light pages). It also has the site navigation, which includes an admin variant, and the footer.
- `src/components/site/Form.jsx` has the form building blocks: cards, fields, segmented controls, pills, switches, the stepper, the info note and the error summary.
- CSS files by area:

  | File | Area |
  |---|---|
  | `public.css` | Home, Browse, plans, contact, terms, payment result |
  | `profile.css` | Profile page |
  | `auth.css` | Log in and register |
  | `advertiser.css` | Advertiser forms |
  | `dashboard.css` | Dashboards and inbox |
  | `admin.css` | Admin |

- **CSS class names:** CRA bundles all CSS globally, so short class names collide across pages. Keep new classes prefixed. Several real collisions were found and fixed this way, for example `.req`, `.media`, `.msg`, `.vf` and `.adm`.

## Pages by design row

1. **Public pages:**
   - Home: `Landing.js`.
   - Browse: `Browse.js` and `ExtraFilters.jsx`. Includes "close to me" with reverse geocoding.
   - Profile page: `ProviderDetail.js`. Includes the gallery with videos, the lightbox, the request form and the report dialog.
   - Advertisement plans, Contact, and Terms & Privacy.
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

## Known limitations and open decisions

1. **Payments still use Stripe** through the `emergentintegrations` package. Stripe is not usable for this business. A high-risk payment provider has to be integrated before launch. The checkout calls are in one place: `createSubscriptionCheckout`, `createBulkCheckout` and `/subscriptions/status`.
2. **`emergentintegrations` and Google log in** go through Emergent's hosted services (`auth.emergentagent.com`). Both have to be replaced when the site moves away from Emergent.
3. **Verification documents** are stored as base64 inside MongoDB. They should move to private object storage.
4. **Uploads are stored on the server's local disk** (`UPLOAD_DIR`). Production needs persistent storage or object storage.
5. **Custom services are not reviewed yet.** The form says "checked by our team", but there is no admin screen for this.
6. **The privacy text still mentions Google Analytics.** Check this against the actual tracking before launch.
7. **E-mails are only sent when `RESEND_API_KEY` is set.** Without it, replies and decisions are saved and the inbox says the e-mail was not sent.
8. **The "Show in Advertisers" link** from the Agencies design was left out, because it had no clear destination.
9. **The old automated tests** in `backend/tests` expect the original hosted environment and its accounts, so they fail locally. The redesign was instead checked end to end in a real browser for every flow:
   - Onboarding, uploads, plans and editing.
   - The inbox and replies.
   - Agency setup, companions, plans and sync.
   - Admin media and ID decisions, and suspending an agency.
   - Desktop (1440 px) and phone (390 px) layouts with no sideways scrolling.
