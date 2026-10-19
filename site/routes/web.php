<?php

/*
 * Web pages. The public pages are PHP templates (resources/views/pages).
 * Log in, register, the dashboards and admin are the React app, built into public/app.
 */

use App\Http\Controllers\PublicController as Pages;
use App\Support\Site;
use Illuminate\Support\Facades\Route;

Route::get('/', [Pages::class, 'home']);
Route::get('/browse', [Pages::class, 'browse']);
Route::get('/providers/{id}', [Pages::class, 'profile']);
Route::get('/advertising-prices', [Pages::class, 'prices']);
Route::get('/contact', [Pages::class, 'contact']);
Route::get('/terms', [Pages::class, 'terms']);
Route::get('/sitemap.xml', [Pages::class, 'sitemap']);
Route::get('/robots.txt', [Pages::class, 'robots']);

// One-time setup (database tables + first admin) for hosting without a terminal. Off unless SETUP_TOKEN is set,
// and off for good once an admin account exists. See app/Http/Controllers/SetupController.php.
Route::get('/setup', [\App\Http\Controllers\SetupController::class, 'show']);
Route::post('/setup', [\App\Http\Controllers\SetupController::class, 'run'])->middleware('throttle:10,1');

// Agencies have no public page.
Route::redirect('/agency', '/browse');
Route::get('/agency/{any}', fn () => redirect('/browse'))->where('any', '.*');

// Pages of the React app. Add an address here when you add a page to that app (frontend/src/App.js).
foreach (Site::APP_ROUTES as $path) {
    Route::get($path, [Pages::class, 'app'])->where('any', '.*');
}

// Everything else: the "page not found" page.
Route::fallback([Pages::class, 'notFound']);
