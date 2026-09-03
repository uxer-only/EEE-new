# Test Credentials

## Provider accounts
- **Sophia (primary demo)**
  - Email: `provider1@lumiere.com`
  - Password: `sophia123`
  - user_id: `user_1155a2b1b59e`
  - provider_id: `provider_024900f536dd`
  - Fully populated, verified profile (New York, USA). Use this account to demo the management dashboard.

- **Emma Test (5-step creation demo)**
  - Email: `newtest@example.com`
  - Password: `test1234`
  - provider_id: `provider_508b05bbf614`

- **Generic test provider**
  - Email: `testprovider@example.com`
  - Password: `password123`

## Client
- Email: `testclient@example.com`
- Password: `password123`

- **Test Owner (forgot-password email test)**
  - Email: `cmu956@gmail.com`
  - Password: `brandnew123` (after reset test; originally `oldpass123`)
  - NOTE: Only email that Resend will actually deliver to while using `onboarding@resend.dev` sender (test mode).

## Admin
- Email: `admin@lumiere.com`
- Password: `admin123`

## Auth flow
- Login endpoint: `POST /api/auth/login` → sets `session_token` cookie (HttpOnly, Secure, SameSite=none)
- Forgot: `POST /api/auth/forgot-password` with `{email}` → neutral response
- Reset: `POST /api/auth/reset-password` with `{token, new_password}` → requires ≥8 chars, single-use token, 24h expiry

## Resend integration
- API key lives in `/app/backend/.env` as `RESEND_API_KEY`
- Sender: `onboarding@resend.dev` (test sender — only delivers to the account owner's email `cmu956@gmail.com` until a custom domain is verified at resend.com/domains)
- Unpaid provider (no subscription): unpaidtest99@test.com / testpass123

## Agency account (multi-profile management)
- **Primary agency demo**
  - Email: `agency@test.com`
  - Password: `agency123`
  - account_type: `agency`
  - 3 profiles seeded: Sofia (Paris), Valentina (Milan), Amara (Amsterdam)
- Older agency (2 profiles): `agency_1788425952@test.com` / `agency1234` (Anna=Paris, Bella=Berlin)
- Agency users land on the AgencyDashboard roster (table of profiles). Click Edit → `/dashboard/profile/:providerId` opens the full ProviderDashboard scoped to that profile. "Add profile" → `/dashboard/profile/new`.
- Register a fresh agency via /register/provider → pick "Agency" button.

