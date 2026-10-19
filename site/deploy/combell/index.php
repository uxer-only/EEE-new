<?php

/*
 * Entry file for hosting where the web folder is fixed (Combell: /www).
 * /www holds the files of Laravel's "public" folder; the rest of the site is in a folder "laravel":
 *   - next to /www  (safest: not reachable from the internet), or
 *   - inside /www   (then /www/laravel/.htaccess blocks every visit to it).
 * Made by site/make-release.sh combell. See site/HOSTING.md.
 */

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$base = is_file(__DIR__.'/../laravel/artisan') ? __DIR__.'/../laravel' : __DIR__.'/laravel';

if (file_exists($maintenance = $base.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $base.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $base.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
