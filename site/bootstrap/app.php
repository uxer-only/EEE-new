<?php

use App\Support\Api;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind the hosting company's proxy: trust its X-Forwarded-* headers (https, visitor IP).
        $middleware->trustProxies(at: '*');
        // The log-in cookie is read by the API itself; it is random and not encrypted by Laravel.
        $middleware->encryptCookies(except: ['session_token', 'ageConfirmed']);
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
