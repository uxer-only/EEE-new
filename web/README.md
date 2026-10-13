# Elite Escorts Europe — site (Next.js)

Server-rendered public pages: Home (`/`), Browse (`/browse`), profiles (`/providers/[id]`), plans, contact and terms.
Log in, register, dashboards and admin are the React app in `../frontend`; this site serves its build from `public/app`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build:app` | Builds the React app and copies it to `public/app` (install its packages first: `npx yarn@1.22.22 install` in `../frontend`) |
| `npm run build:all` | `build:app`, then builds this site |
| `npm start` | Runs the built site on port 3000 |

Environment variables (needed when building and when running):

- `API_URL`: the backend's own address, for example `http://localhost:8001`. Requests to `/api/...` are forwarded there.
- `SITE_URL`: the public address, for example `https://www.eliteescortseurope.com`. Used for canonical links, the sitemap and link previews.

Where things are:

- `app/`: the pages. `page.js` files run on the server; files with `'use client'` also run in the browser.
- `components/site/Shell.jsx`: header, footer, age check and page backgrounds.
- `lib/server-api.js`: backend calls made while rendering; `lib/api.js`: calls made from the browser.
- `next.config.mjs`: forwarding to the backend and the list of addresses handled by the React app (`APP_ROUTES`).
- Styles: `../frontend/src/styles/site.css` and `public.css` are shared with the React app; `styles/` holds the reset (`base.css`), the profile page and a few Next.js-only rules.
