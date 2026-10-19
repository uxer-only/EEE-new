<?php

use App\Support\Api;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind the hosting company's proxy: trust its X-Forwarded-* headers (https, visitor IP).
        $middleware->trustProxies(at: '*');
        // Other domains, no "www" or plain http → permanent redirect to APP_URL (live site only).
        $middleware->append(\App\Http\Middleware\CanonicalHost::class);
        // The log-in cookie is read by the API itself; it is random and not encrypted by Laravel.
        $middleware->encryptCookies(except: ['session_token', 'ageConfirmed']);
        // The public pages have no forms that post to Laravel and set no cookies of their own
        // (the Terms page promises only essential cookies), so no Laravel session or form token.
        $middleware->web(remove: [
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API errors look like the earlier backend: {"detail": "..."}
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (!$request->is('api/*')) {
                return null;
            }
            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $text = \Symfony\Component\HttpFoundation\Response::$statusTexts[$status] ?? 'Error';
                return Api::json(['detail' => $e->getMessage() ?: $text], $status);
            }
            if ($e instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                return $e->getResponse();
            }
            report($e);
            return Api::json(['detail' => config('app.debug') ? $e->getMessage() : 'Internal Server Error'], 500);
        });
    })->create();

// Hosting where the web folder is fixed (Combell: /www): the files of "public" are in that folder and the rest
// of the site is in a folder "laravel" next to it or inside it (see HOSTING.md). Tell Laravel where they are.
if (!is_dir($app->basePath('public'))) {
    foreach ([dirname($app->basePath()).'/www', dirname($app->basePath())] as $web) {
        if (is_file($web.'/index.php')) {
            $app->usePublicPath($web);
            break;
        }
    }
}

return $app;
