# Elite Escorts Europe

Advertising directory for independent escorts and agencies.

- `site/`: **the website in PHP (Laravel) with MySQL.** It serves the public pages (Home, Browse, profiles, plans, contact, terms), the API, and the ready-built React screens for log in, register, dashboards and admin (`site/public/app`). This is the version to put online: see `site/HOSTING.md`.
- `frontend/`: the source of those React screens. After a change, rebuild them with `bash site/build-app.sh` (needs Node.js on your computer only).
- `web/` (Next.js) and `backend/` (FastAPI + MongoDB): the earlier version. The PHP version replaces both; they can be removed once it is online.
- Local demo: on a Mac double-click `Start demo.command` (or run `bash demo/run_php_demo.sh`); it opens http://localhost:3000

Read `HANDOFF.md` first: it explains the redesign, the pages, the PHP version and the open decisions.
