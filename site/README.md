# Elite Escorts Europe — PHP version (Laravel)

This folder is the complete website in PHP. It needs only PHP 8.3+ and MySQL (or SQLite for the demo):
no Python, no Node.js and no MongoDB on the server.

- `routes/api.php` — the JSON API used by the dashboards and admin screens (same addresses as before).
- `app/Support/` — the shared logic (profiles, plans, payments, e-mails, invoices).
- `public/` — the web root: the dashboards (`public/app`), images, styles and fonts.

Demo on this computer: `php artisan migrate --force && php artisan eee:demo --fresh && php artisan serve`.
The hosting guide is in `HOSTING.md`.
