<?php

namespace App\Http\Controllers;

use App\Support\Browse;
use App\Support\Site;
use App\Support\Time;
use Illuminate\Http\Request;

/** The public pages: Home, Browse, profiles, plans, contact, terms, sitemap.xml and robots.txt. */
class PublicController
{
    /** Visible profiles in the Browse order; an empty list when something fails, so the page still shows. */
    private static function providers(Request $request, array $filters = []): array
    {
        try {
            return Browse::search($filters, $request);
        } catch (\Throwable $e) {
            report($e);
            return [];
        }
    }

    public function home(Request $request)
    {
        return view('pages.home', ['providers' => array_slice(self::providers($request), 0, 10)]);
    }

    public function browse(Request $request)
    {
        $city = trim((string) $request->query('city', ''));
        // One shuffle seed per visit: the order changes on every visit but stays stable while filtering.
        $seed = random_int(0, 999999999);
        $providers = self::providers($request, array_filter(['seed' => (string) $seed, 'city' => $city], 'strlen'));
        return view('pages.browse', compact('providers', 'city', 'seed'));
    }

    public function profile(string $id)
    {
        $p = Browse::profile($id);
        if (!$p) {
            return $this->notFound();
        }
        return view('pages.profile', ['p' => $p]);
    }

    public function prices()
    {
        return view('pages.prices');
    }

    public function contact()
    {
        return view('pages.contact');
    }

    public function terms()
    {
        return view('pages.terms');
    }

    public function notFound()
    {
        return response()->view('pages.not-found', [], 404);
    }

    /** sitemap.xml: the public pages, every city with live profiles, and every live profile. */
    public function sitemap(Request $request)
    {
        $providers = self::providers($request);
        $cities = array_values(array_unique(array_filter(array_map(fn ($p) => trim($p['location']['city'] ?? ''), $providers))));
        sort($cities);
        $u = fn ($path, $freq, $prio, $mod = null) => compact('path', 'freq', 'prio', 'mod');
        $urls = [$u('/', 'daily', '1'), $u('/browse', 'daily', '0.9')];
        foreach ($cities as $c) {
            $urls[] = $u('/browse?city='.rawurlencode($c), 'daily', '0.8');
        }
        foreach ($providers as $p) {
            $when = $p['updated_at'] ?? ($p['created_at'] ?? null);
            $urls[] = $u('/providers/'.$p['provider_id'], 'weekly', '0.7', $when ? Time::parse($when)->format('Y-m-d\TH:i:s.v\Z') : null);
        }
        array_push($urls, $u('/advertising-prices', 'monthly', '0.5'), $u('/contact', 'yearly', '0.3'), $u('/terms', 'yearly', '0.2'));

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($urls as $x) {
            $xml .= '<url>'."\n".'<loc>'.htmlspecialchars(Site::url($x['path']), ENT_XML1).'</loc>'."\n"
                .($x['mod'] ? '<lastmod>'.$x['mod'].'</lastmod>'."\n" : '')
                .'<changefreq>'.$x['freq'].'</changefreq>'."\n".'<priority>'.$x['prio'].'</priority>'."\n".'</url>'."\n";
        }
        return response($xml.'</urlset>'."\n", 200, ['Content-Type' => 'application/xml']);
    }

    public function robots()
    {
        $txt = "User-Agent: *\nAllow: /\n";
        foreach (['/api/', '/admin', '/dashboard', '/messages', '/payment-success', '/subscribe', '/verify-email', '/reset-password', '/app/'] as $d) {
            $txt .= "Disallow: $d\n";
        }
        return response($txt."\nSitemap: ".Site::url('/sitemap.xml')."\n", 200, ['Content-Type' => 'text/plain']);
    }

    /** Pages of the React app (log in, dashboards, admin): its index.html, never cached and kept out of search engines. */
    public function app()
    {
        $file = public_path('app/index.html');
        if (!is_file($file)) {
            abort(503, 'The dashboards are not built yet (public/app is missing).');
        }
        return response()->file($file, [
            'Content-Type' => 'text/html; charset=utf-8',
            'Cache-Control' => 'no-cache',
            'X-Robots-Tag' => 'noindex',
        ]);
    }
}
