<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Locations for "nearest first" on Browse. Results are cached in the database. */
class Geo
{
    private const UA = 'EliteEscortsEurope/1.0 (info@eliteescortseurope.eu)';

    /** The visitor's first public IP address (from X-Forwarded-For when behind a proxy). */
    public static function visitorIp(Request $request): ?string
    {
        $candidates = array_filter(array_map('trim', explode(',', (string) $request->header('x-forwarded-for'))));
        if ($request->server('REMOTE_ADDR')) {
            $candidates[] = $request->server('REMOTE_ADDR');
        }
        foreach ($candidates as $ip) {
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
        return null;
    }

    /** [lat, lng] of a public IP (ipgeolocation.io), cached 24 h. Null without an API key. */
    public static function ipCoords(?string $ip): ?array
    {
        $key = config('eee.ipgeolocation_api_key');
        if (!$key || !$ip) {
            return null;
        }
        $row = DB::table('ip_geo_cache')->where('ip', $ip)->first();
        if ($row && $row->expires_at > time()) {
            return $row->lat !== null ? [(float) $row->lat, (float) $row->lng] : null;
        }
        $coords = null;
        try {
            $r = Http::timeout(4)->get('https://api.ipgeolocation.io/v3/ipgeo', ['apiKey' => $key, 'ip' => $ip, 'fields' => 'location']);
            $loc = $r->successful() ? ($r->json('location') ?? []) : [];
            if (isset($loc['latitude'], $loc['longitude'])) {
                $coords = [(float) $loc['latitude'], (float) $loc['longitude']];
            }
        } catch (\Throwable $e) {
            Log::error("IP geolocation failed for $ip: ".$e->getMessage());
        }
        DB::table('ip_geo_cache')->updateOrInsert(['ip' => $ip], ['lat' => $coords[0] ?? null, 'lng' => $coords[1] ?? null, 'expires_at' => time() + 86400]);
        return $coords;
    }

    /** [lat, lng] of a city (OpenStreetMap Nominatim), cached. */
    public static function city(string $city, string $country = ''): ?array
    {
        if (trim($city) === '') {
            return null;
        }
        $key = strtolower(trim($city)).'|'.strtolower(trim($country));
        $row = DB::table('geocode_cache')->where('cache_key', $key)->first();
        if ($row) {
            return $row->lat !== null ? [(float) $row->lat, (float) $row->lng] : null;
        }
        $coords = null;
        try {
            $r = Http::withHeaders(['User-Agent' => self::UA])->timeout(5)
                ->get('https://nominatim.openstreetmap.org/search', ['q' => $country ? "$city, $country" : $city, 'format' => 'json', 'limit' => 1]);
            $arr = $r->successful() ? $r->json() : [];
            if (!empty($arr[0]['lat'])) {
                $coords = [(float) $arr[0]['lat'], (float) $arr[0]['lon']];
            }
        } catch (\Throwable $e) {
            Log::error("Geocoding failed for '$city': ".$e->getMessage());
        }
        DB::table('geocode_cache')->updateOrInsert(['cache_key' => $key], ['lat' => $coords[0] ?? null, 'lng' => $coords[1] ?? null]);
        return $coords;
    }

    /** City name for a device location, rounded to ~1 km. Nothing is stored with any user. */
    public static function reverse(float $lat, float $lng): ?string
    {
        $rl = round($lat, 2);
        $rg = round($lng, 2);
        $key = "rev|$rl|$rg";
        $row = DB::table('geocode_cache')->where('cache_key', $key)->first();
        if ($row) {
            return $row->city;
        }
        $city = null;
        try {
            $r = Http::withHeaders(['User-Agent' => self::UA])->timeout(5)->get('https://nominatim.openstreetmap.org/reverse',
                ['lat' => $rl, 'lon' => $rg, 'format' => 'json', 'zoom' => 10, 'accept-language' => 'en']);
            $a = $r->successful() ? ($r->json('address') ?? []) : [];
            $city = $a['city'] ?? $a['town'] ?? $a['village'] ?? $a['municipality'] ?? null;
        } catch (\Throwable $e) {
            Log::error('Reverse geocoding failed: '.$e->getMessage());
        }
        DB::table('geocode_cache')->updateOrInsert(['cache_key' => $key], ['city' => $city]);
        return $city;
    }

    public static function km(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $p1 = deg2rad($lat1);
        $p2 = deg2rad($lat2);
        $a = sin(deg2rad($lat2 - $lat1) / 2) ** 2 + cos($p1) * cos($p2) * sin(deg2rad($lng2 - $lng1) / 2) ** 2;
        return 6371.0 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /** Distance zone for Browse ordering: 0 (≤10 km) … 4 (>100 km), 5 when unknown. */
    public static function zone(?float $km): int
    {
        if ($km === null) {
            return 5;
        }
        foreach ([10, 25, 50, 100] as $i => $limit) {
            if ($km <= $limit) {
                return $i;
            }
        }
        return 4;
    }
}
