<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * One address for the whole site (good for search engines).
 * Every request that arrives on another domain (another domain name, without "www", or over plain http)
 * is sent with a permanent redirect (301) to the same page on the address in APP_URL,
 * for example https://www.eliteescortseurope.eu. The page path and the ?query are kept.
 *
 * Only on the live site (APP_ENV=production). Switch off with CANONICAL_REDIRECT=false.
 */
class CanonicalHost
{
    public function handle(Request $request, Closure $next)
    {
        if (!config('eee.canonical_redirect') || !app()->environment('production')) {
            return $next($request);
        }
        $target = parse_url((string) config('eee.site_url'));
        $host = strtolower($target['host'] ?? '');
        $scheme = $target['scheme'] ?? 'https';
        if ($host === '' || $host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
            return $next($request);
        }
        $wrongHost = strtolower($request->getHost()) !== $host;
        $wrongScheme = $scheme === 'https' && !$request->isSecure() && config('eee.force_https');
        if (!$wrongHost && !$wrongScheme) {
            return $next($request);
        }
        $url = $scheme.'://'.$host.(isset($target['port']) ? ':'.$target['port'] : '').$request->getRequestUri();
        // 301 for normal page visits; 308 keeps POST requests (forms, payment notifications) intact.
        $status = in_array($request->getMethod(), ['GET', 'HEAD'], true) ? 301 : 308;
        return redirect()->away($url, $status)->header('Cache-Control', 'public, max-age=86400');
    }
}
