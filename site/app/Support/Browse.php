<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The list of profiles on Browse (and the Home page). Used by GET /api/providers and the public pages.
 *
 * Only live profiles are listed: verified, available, not suspended, with an active plan or within
 * the grace period. Order: VIPs first; then, when the visitor's location is known, by distance
 * zone; profiles are shuffled within each group with a per-visit seed.
 */
class Browse
{
    private const CHAR_EQ = ['ethnicity', 'orientation', 'eye_color', 'hair_color', 'hair_length', 'breast_size',
        'breast_type', 'pubic_hair', 'tattoos', 'piercings', 'smoker'];

    public static function search(array $f, Request $request): array
    {
        $now = Time::now();
        $profiles = Docs::find('provider_profiles', [
            'verified' => 1,
            'available' => 1,
            'suspended' => 0,
            'featured_until' => ['>', $now->subDays(config('eee.grace_days'))],
        ]);

        $num = fn ($v) => (is_int($v) || is_float($v) || (is_string($v) && is_numeric(trim($v)))) ? (float) $v : null;
        $inRange = function ($v, $min, $max) use ($num) {
            $n = $num($v);
            if ($n === null) {
                return false;
            }
            return ($min === null || $n >= $min) && ($max === null || $n <= $max);
        };
        $has = fn ($k) => isset($f[$k]) && $f[$k] !== '' && $f[$k] !== null;
        $flt = fn ($k) => $has($k) && is_numeric($f[$k]) ? (float) $f[$k] : null;

        $city = $has('city') ? mb_strtolower(trim((string) $f['city'])) : null;
        $service = $has('service') ? trim((string) $f['service']) : null;
        $minRate = $flt('min_rate');
        $maxRate = $flt('max_rate');
        $langs = $has('languages') ? array_values(array_filter(array_map('trim', explode(',', (string) $f['languages'])))) : [];
        $nat = $has('nationality') ? mb_strtolower((string) $f['nationality']) : null;
        $ranges = [
            'height' => [$flt('min_height'), $flt('max_height')],
            'weight' => [$flt('min_weight'), $flt('max_weight')],
        ];
        $ageRange = [$flt('min_age'), $flt('max_age')];

        $out = [];
        foreach ($profiles as $p) {
            $c = is_array($p['characteristics'] ?? null) ? $p['characteristics'] : [];
            if ($city !== null && !str_contains(mb_strtolower((string) ($p['location']['city'] ?? '')), $city)) {
                continue;
            }
            if ($service !== null) {
                $s = $p['services'] ?? [];
                $ok = is_array($s) && (array_is_list($s) ? in_array($service, $s, true)
                    : (isset($s[$service]) && is_array($s[$service]) && !empty($s[$service]['type'])));
                if (!$ok) {
                    continue;
                }
            }
            if ($minRate !== null || $maxRate !== null) {
                $r = is_array($p['rates'] ?? null) ? $p['rates'] : [];
                $vals = [$r['incall']['1hour'] ?? null, $r['outcall']['1hour'] ?? null, $r['1hour'] ?? null];
                if (!array_filter($vals, fn ($v) => $inRange($v, $minRate, $maxRate))) {
                    continue;
                }
            }
            if ($has('gender') && ($p['gender'] ?? null) !== $f['gender']) {
                continue;
            }
            foreach (self::CHAR_EQ as $k) {
                if ($has($k) && ($c[$k] ?? null) !== $f[$k]) {
                    continue 2;
                }
            }
            if ($nat !== null && !str_contains(mb_strtolower((string) ($c['nationality'] ?? '')), $nat)) {
                continue;
            }
            if ($langs) {
                $pl = is_array($c['languages'] ?? null) ? $c['languages'] : [];
                if (array_diff($langs, $pl)) {
                    continue;
                }
            }
            foreach ($ranges as $k => [$min, $max]) {
                if (($min !== null || $max !== null) && !$inRange($c[$k] ?? null, $min, $max)) {
                    continue 2;
                }
            }
            if (($ageRange[0] !== null || $ageRange[1] !== null) && !$inRange($p['age'] ?? null, ...$ageRange)) {
                continue;
            }
            $p['vip_active'] = Time::after($p['vip_until'] ?? null, $now);
            $out[] = $p;
        }

        // ----- order -----
        $seed = $has('seed') && is_numeric($f['seed']) ? (string) (int) $f['seed'] : (string) random_int(0, 1 << 30);
        $shuffle = fn ($p) => hexdec(substr(hash('sha256', $seed.':'.($p['provider_id'] ?? '')), 0, 12)) / 0xFFFFFFFFFFFF;

        $visitor = null;
        if ($has('origin_lat') && $has('origin_lng') && is_numeric($f['origin_lat']) && is_numeric($f['origin_lng'])) {
            $visitor = [(float) $f['origin_lat'], (float) $f['origin_lng']];
        }
        if (!$visitor && $has('origin_city')) {
            $visitor = Geo::city((string) $f['origin_city'], (string) ($f['origin_country'] ?? ''));
        }
        if (!$visitor) {
            $visitor = Geo::ipCoords(Geo::visitorIp($request));
        }
        if ($visitor) {
            foreach ($out as &$p) {
                $loc = is_array($p['location'] ?? null) ? $p['location'] : [];
                $plat = $loc['lat'] ?? null;
                $plng = $loc['lng'] ?? null;
                if ($plat === null || $plng === null) {
                    $coords = Geo::city((string) ($loc['city'] ?? ''), (string) ($loc['country'] ?? ''));
                    if ($coords) {
                        [$plat, $plng] = $coords;
                        $pid = $p['provider_id'];
                        Docs::update('provider_profiles', ['provider_id' => $pid], function ($d) use ($plat, $plng) {
                            $d['location'] = array_replace(is_array($d['location'] ?? null) ? $d['location'] : [], ['lat' => $plat, 'lng' => $plng]);
                            return $d;
                        });
                        $p['location'] = array_replace($loc, ['lat' => $plat, 'lng' => $plng]);
                    }
                }
                $p['distance_km'] = ($plat !== null && $plng !== null) ? round(Geo::km($visitor[0], $visitor[1], (float) $plat, (float) $plng), 1) : null;
            }
            unset($p);
            usort($out, fn ($a, $b) => [$a['vip_active'] ? 0 : 1, Geo::zone($a['distance_km']), $shuffle($a)]
                <=> [$b['vip_active'] ? 0 : 1, Geo::zone($b['distance_km']), $shuffle($b)]);
        } else {
            usort($out, fn ($a, $b) => [$a['vip_active'] ? 0 : 1, $shuffle($a)] <=> [$b['vip_active'] ? 0 : 1, $shuffle($b)]);
        }
        $out = array_slice($out, 0, 200);

        // ----- user info (one query) -----
        $ids = array_values(array_unique(array_column($out, 'user_id')));
        $users = $ids ? DB::table('users')->whereIn('user_id', $ids)->get(['user_id', 'name', 'picture'])->keyBy('user_id') : collect();
        foreach ($out as &$p) {
            $u = $users[$p['user_id']] ?? null;
            $p['user'] = $u ? ['name' => $u->name, 'picture' => $u->picture] : null;
            $p['services'] = Profiles::publicServices($p['services'] ?? []);
        }
        unset($p);
        return $out;
    }

    /** One public profile with the extra fields the profile page needs, or null. */
    public static function profile(string $providerId): ?array
    {
        $p = Docs::first('provider_profiles', ['provider_id' => $providerId]);
        if (!$p) {
            return null;
        }
        $u = DB::table('users')->where('user_id', $p['user_id'])->first(['name', 'picture', 'account_type']);
        // The account e-mail stays private; visitors only see the public contact details.
        $p['user'] = $u ? ['name' => $u->name, 'picture' => $u->picture, 'account_type' => $u->account_type] : null;
        $p['services'] = Profiles::publicServices($p['services'] ?? []);
        $now = Time::now();
        $p['featured_active'] = Time::after($p['featured_until'] ?? null, $now);
        $p['in_grace'] = Profiles::grace($p['featured_until'] ?? null, $now)['in_grace'];
        $p['vip_active'] = Time::after($p['vip_until'] ?? null, $now);
        $p['videos'] = array_values(array_filter(array_map(fn ($m) => $m['url'] ?? null,
            Docs::find('provider_media', ['provider_id' => $providerId, 'media_type' => 'video', 'status' => 'approved'], 'uploaded_at', 'asc', 20))));
        return $p;
    }
}
