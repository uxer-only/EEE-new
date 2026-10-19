# Putting the site online (PHP + MySQL hosting)

The PHP version runs on ordinary web hosting with **PHP 8.3 or newer** and **MySQL or MariaDB**.
No Node.js, no Python and no MongoDB are needed on the server.

## What the hosting package must offer

- PHP 8.3+ with these extensions (standard on most hosts): `pdo_mysql`, `mbstring`, `openssl`, `curl`, `fileinfo`, `tokenizer`, `xml`, `ctype`
- One MySQL / MariaDB database
- **SSH access** (a terminal on the server), to run the set-up commands below. Ask the host if you're not sure.
- A **cron job** (scheduled task), at least once an hour
- HTTPS (a free Let's Encrypt certificate is included with most packages)
- Upload limit of at least 12 MB per file (the file `public/.user.ini` asks for this; some hosts set it in their control panel)

## 1. Make the upload package (on your computer)

From the project folder:

```
bash site/make-release.sh
```

This creates `releases/eee-site-YYYY-MM-DD.zip` (about 30 MB): the site with all its PHP packages.
It contains no passwords and no data.

## 2. Upload and point the domain at `public/`

1. Upload the zip to the server and unzip it, for example into `/home/youraccount/eee/site`.
2. In the hosting control panel, set the domain's **document root** (also called "root folder" or "web folder") to the `public` folder inside it: `/home/youraccount/eee/site/public`.

   Only `public/` may be reachable from the internet. The rest (settings, uploads) must not be.

   *If the host doesn't let you change the document root* (for example it is fixed to `public_html`), put the contents
   of `site/public/` in `public_html/`, put the rest of `site/` next to it (outside `public_html`), and in
   `public_html/index.php` change the two paths `__DIR__.'/../vendor/autoload.php'` and `__DIR__.'/../bootstrap/app.php'`
   to point at that folder.

## 3. Settings (`.env`)

In the site folder, copy `.env.example` to `.env` and fill it in:

| Setting | What to put |
|---|---|
| `APP_URL` | The public address, for example `https://www.eliteescortseurope.eu` |
| `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | From the hosting control panel (MySQL section) |
| `RESEND_API_KEY` | A **new** key from resend.com (API keys → Create, "Sending access") |
| `SENDER_EMAIL`, `REPORT_EMAIL` | The address e-mails are sent from (a domain verified in Resend), and where fake-profile reports go |
| `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | Only while Stripe is used for payments |
| `IPGEOLOCATION_API_KEY` | Optional |

Never put `.env` on GitHub or send it by e-mail: it holds the passwords. Keep `APP_ENV=production` and `APP_DEBUG=false`.

## 4. First-time set-up (SSH, in the site folder)

```
php artisan key:generate --force      # once: creates APP_KEY in .env
php artisan migrate --force           # creates the database tables
php artisan eee:admin you@example.com # your admin account (asks for a password, 12+ characters)
php artisan optimize                  # makes the site faster (run again after every update)
```

The folders `storage/` and `bootstrap/cache/` must be writable by PHP (usually they already are).
Uploaded photos and videos are stored in `storage/app/uploads` (outside `public/`, served through the site). ID documents are kept in the database.

## 5. Scheduled tasks (cron)

Add one cron job in the control panel. Best, every minute:

```
* * * * * cd /home/youraccount/eee/site && php artisan schedule:run >> /dev/null 2>&1
```

If the host only allows hourly cron jobs, use this instead, every 6 hours:

```
0 */6 * * * cd /home/youraccount/eee/site && php artisan eee:jobs >> /dev/null 2>&1
```

This sends the renewal e-mails when a listing ends, turns page views older than 90 days into daily totals,
and removes expired log-in sessions.

## Extra domain names (redirects)

All other domain names (for example eliteescortseurope.com, eliteescortseurope.be) should lead to the one main address in `APP_URL`
(`https://www.eliteescortseurope.eu`). The site does this itself with a **permanent redirect (301)** to the same page, for example
`eliteescortseurope.com/browse?city=Paris` → `https://www.eliteescortseurope.eu/browse?city=Paris`. The address without "www" and plain
`http://` are sent there too. Search engines move the old addresses' ranking to the main address, and old links keep working.

What to do at Combell, for each extra domain:

1. Add it to the **same hosting** as an extra domain name (alias). Do **not** use Combell's own "redirect" or "forward" option and don't
   point it at a separate empty website: those often send everything to the home page or use a temporary redirect.
2. Turn on a free **HTTPS certificate** (Let's Encrypt) for it too, including the "www" version. Without it, visitors typing
   `https://other-domain` see a security warning before the redirect can happen.
3. Add only the main domain in Google Search Console (as a "Domain" property) and submit `https://www.eliteescortseurope.eu/sitemap.xml`.
   If an extra domain ever had its own website with pages in Google, add it to Search Console as well and use
   "Settings → Change of address" to tell Google it moved.

Payment and e-mail settings (Stripe/CCBill webhooks, Resend) should always use the main address.
The redirects only work on the live site (`APP_ENV=production`); `CANONICAL_REDIRECT=false` in `.env` switches them off.

## 6. Stripe (while it is used)

In the Stripe dashboard, add a webhook to `https://YOUR-DOMAIN/api/webhook/stripe` for the event
`checkout.session.completed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## 7. Check

- Open the site: the age check, Home, Browse and a profile should show.
- Log in at `/admin/login` with the admin account.
- Register a test advertiser and check that the confirmation e-mail arrives.

## Updating the site later

1. Make a new package (`bash site/make-release.sh`).
2. Upload it and replace the files on the server, **except** `.env` and `storage/` (they hold your settings and the uploads).
3. Over SSH: `php artisan migrate --force && php artisan optimize`

## Back-ups

Back up two things regularly: the MySQL database (most hosts do this daily; it also holds the ID documents) and the folder `storage/app/uploads`.

## Web server notes (for the hosting company)

- Apache: `public/.htaccess` is included (needs `mod_rewrite`).
- nginx: send every request that isn't a file to `index.php`:

  ```
  root /path/to/site/public;
  location / { try_files $uri $uri/ /index.php?$query_string; }
  location ~ \.php$ { include fastcgi_params; fastcgi_pass unix:/run/php/php8.3-fpm.sock; fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name; }
  client_max_body_size 14m;
  ```
