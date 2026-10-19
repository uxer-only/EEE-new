<?php

/*
 * Settings of Elite Escorts Europe. Set the values in the .env file (see .env.example).
 */
return [
    'product_name' => 'Elite Escorts Europe',

    // Public address of the site, e.g. https://www.eliteescortseurope.eu (also used in e-mails).
    'site_url' => rtrim(env('APP_URL', 'http://localhost:8000'), '/'),

    // Live site: send visitors from other domains, the address without "www" and plain http
    // to the same page on APP_URL with a permanent redirect (app/Http/Middleware/CanonicalHost.php).
    'canonical_redirect' => (bool) env('CANONICAL_REDIRECT', true),
    'force_https' => (bool) env('FORCE_HTTPS', true),

    // E-mails go out through Resend (resend.com). Without a key, e-mails are only written to the log.
    'resend_api_key' => env('RESEND_API_KEY'),
    'sender_email' => env('SENDER_EMAIL', 'onboarding@resend.dev'),
    'report_email' => env('REPORT_EMAIL', 'info@eliteescortseurope.eu'),

    // Payments (temporary: Stripe, to be replaced by the chosen payment provider).
    'stripe_api_key' => env('STRIPE_API_KEY'),
    // Signing secret of the Stripe webhook (Stripe dashboard → Webhooks). When set, webhook calls are checked.
    'stripe_webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),

    // Optional: visitor IP → location, for "nearest first" on Browse (ipgeolocation.io).
    'ipgeolocation_api_key' => env('IPGEOLOCATION_API_KEY'),

    // Uploaded photos and videos. Must be a folder that is kept between updates.
    'upload_dir' => env('UPLOAD_DIR', storage_path('app/uploads')),
    'max_upload_bytes' => 10 * 1024 * 1024,

    // Scrambles the daily visitor code of the page-view counter. Any long random text.
    'visitor_salt' => env('VISITOR_SALT', env('APP_KEY', 'eee')),

    // Listings stay visible this many days after their plan ends.
    'grace_days' => 3,

    // Raw page views are kept this many days, then only daily totals remain.
    'traffic_raw_days' => 90,

    // One-time setup page /setup (for hosting without a terminal): set SETUP_TOKEN in .env to a long secret.
    // The page creates the database tables and the first admin, then switches itself off.
    'setup_token' => env('SETUP_TOKEN'),

    // Added to the style and script addresses, so browsers load new files after an update. Change it when you change public/css or public/js.
    'asset_version' => env('ASSET_VERSION', '3'),

];
