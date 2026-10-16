<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Rules for advertiser profiles, shared by the API and the public pages. */
class Profiles
{
    /**
     * Rates as numbers. Supports the nested shape ({incall: {...}, outcall: {...}, currency})
     * and the older flat shape ({"1hour": 150, ...}). Empty values are left out.
     */
    public static function normalizeRates($rates): array
    {
        if (!is_array($rates) || !$rates) {
            return [];
        }
        $num = fn ($v) => is_int($v) || is_float($v) || (is_string($v) && is_numeric(trim($v))) ? (float) $v : null;
        if (array_key_exists('incall', $rates) || array_key_exists('outcall', $rates)) {
            $out = [];
            foreach (['incall', 'outcall'] as $kind) {
                $col = $rates[$kind] ?? null;
                if (!is_array($col)) {
                    continue;
                }
                $c = [];
                foreach ($col as $k => $v) {
                    if ($k === 'extras') {
                        $extras = [];
                        foreach ((array) ($v ?? []) as $item) {
                            if (!is_array($item)) {
                                continue;
                            }
                            $h = $item['hours'] ?? null;
                            $p = $num($item['price'] ?? null);
                            if ((is_int($h) || (is_string($h) && ctype_digit(trim($h))) || (is_float($h) && floor($h) == $h)) && $p !== null) {
                                $extras[] = ['hours' => (int) $h, 'price' => $p];
                            }
                        }
                        if ($extras) {
                            $c['extras'] = $extras;
                        }
                        continue;
                    }
                    if ($v === null || $v === '') {
                        continue;
                    }
                    $n = $num($v);
                    if ($n !== null) {
                        $c[$k] = $n;
                    }
                }
                if ($c) {
                    $out[$kind] = $c;
                }
            }
            $cur = $rates['currency'] ?? null;
            if (is_string($cur) && preg_match('/^[A-Z]{3}$/', $cur)) {
                $out['currency'] = $cur;
            }
            return $out;
        }
        $flat = [];
        foreach ($rates as $k => $v) {
            if ($v === null || $v === '') {
                continue;
            }
            $n = $num($v);
            if ($n !== null) {
                $flat[$k] = $n;
            }
        }
        return $flat;
    }

    /**
     * Custom services (added by advertisers) are "pending" until an admin approves them.
     * The review state sent by the browser is ignored.
     */
    public static function applyServiceReview($new, $old)
    {
        if (!is_array($new) || (array_is_list($new) && $new !== [])) {
            return $new;
        }
        $old = is_array($old) ? $old : [];
        $out = [];
        foreach ($new as $name => $v) {
            if (is_array($v) && !empty($v['custom'])) {
                $prev = $old[$name] ?? null;
                $approved = is_array($prev) && !empty($prev['custom']) && ($prev['review'] ?? null) === 'approved';
                $v['review'] = $approved ? 'approved' : 'pending';
                unset($v['reason']);
            }
            $out[$name] = $v;
        }
        return $out;
    }

    /** Services as visitors see them: custom services only once approved. */
    public static function publicServices($services)
    {
        if (!is_array($services) || (array_is_list($services) && $services !== [])) {
            return $services;
        }
        return array_filter($services, fn ($v) => !(is_array($v) && !empty($v['custom']) && ($v['review'] ?? null) !== 'approved'));
    }

    public static function pendingCustomServices($services): array
    {
        if (!is_array($services) || array_is_list($services)) {
            return [];
        }
        $out = [];
        foreach ($services as $k => $v) {
            if (is_array($v) && !empty($v['custom']) && ($v['review'] ?? null) === 'pending' && !empty($v['type'])) {
                $out[] = (string) $k;
            }
        }
        return $out;
    }

    /** Lapsed listings stay visible for a few days (grace period) with a renew prompt. */
    public static function grace($featuredUntil, ?CarbonImmutable $now = null): array
    {
        $now ??= Time::now();
        $fu = Time::parse($featuredUntil);
        if (!$fu || $fu->greaterThan($now)) {
            return ['in_grace' => false, 'grace_days_left' => 0];
        }
        $end = $fu->addDays(config('eee.grace_days'));
        if ($end->lessThanOrEqualTo($now)) {
            return ['in_grace' => false, 'grace_days_left' => 0];
        }
        return ['in_grace' => true, 'grace_days_left' => Time::daysLeft($end, $now)];
    }

    public static function ratesSet($rates): bool
    {
        if (!is_array($rates)) {
            return (bool) $rates;
        }
        $col = function ($c) {
            if (!is_array($c)) {
                return (bool) $c;
            }
            foreach (['1hour', '2hours', '3hours', 'overnight'] as $k) {
                if (!empty($c[$k])) {
                    return true;
                }
            }
            foreach ((array) ($c['extras'] ?? []) as $e) {
                if (is_array($e) && !empty($e['price'])) {
                    return true;
                }
            }
            return false;
        };
        if (array_key_exists('incall', $rates) || array_key_exists('outcall', $rates)) {
            return $col($rates['incall'] ?? null) || $col($rates['outcall'] ?? null);
        }
        return $col($rates);
    }

    public static function availSet(array $p): bool
    {
        if (!empty($p['available247'])) {
            return true;
        }
        $s = $p['schedule'] ?? [];
        if (is_array($s) && isset($s['schedule']) && is_array($s['schedule'])) {
            $s = $s['schedule'];
        }
        if (is_array($s)) {
            foreach ($s as $d) {
                if (is_array($d) && (!empty($d['available']) || !empty($d['start']))) {
                    return true;
                }
            }
        }
        return false;
    }

    /** [completed steps, total steps, plan can be chosen] */
    public static function completion(array $p): array
    {
        $loc = $p['location'] ?? [];
        $basic = !empty($p['display_name']) && !empty($p['age']) && !empty($loc['city']) && (!empty($p['bio']) || !empty($p['essence']));
        $services = !empty($p['services']);
        $rates = self::ratesSet($p['rates'] ?? null);
        $avail = self::availSet($p);
        $photos = !empty($p['photos']);
        return [(int) $basic + (int) $services + (int) $rates + (int) $avail + (int) $photos, 5, $basic && $services && $rates];
    }

    /** A profile owned by the signed-in provider (an agency picks one with $providerId). */
    public static function owned(array $user, ?string $providerId = null): ?array
    {
        if ($user['role'] !== 'provider') {
            Api::fail(403, 'Provider access only');
        }
        $where = ['user_id' => $user['user_id']];
        if ($providerId) {
            $where['provider_id'] = $providerId;
        }
        return Docs::first('provider_profiles', $where);
    }

    /** Live = shown on Browse: verified, available, not suspended, plan active or in grace. */
    public static function isLive(array $p, ?CarbonImmutable $now = null): bool
    {
        $now ??= Time::now();
        $fu = Time::parse($p['featured_until'] ?? null);
        return empty($p['suspended']) && !empty($p['verified']) && ($p['available'] ?? true)
            && $fu && $fu->greaterThan($now->subDays(config('eee.grace_days')));
    }

    /** Plan / visibility summary for the admin screens. */
    public static function adminPlan(array $p, ?CarbonImmutable $now = null): array
    {
        $now ??= Time::now();
        $fu = Time::parse($p['featured_until'] ?? null);
        $vu = Time::parse($p['vip_until'] ?? null);
        $fa = $fu && $fu->greaterThan($now);
        $va = $vu && $vu->greaterThan($now);
        $grace = self::grace($fu, $now);
        $meta = Plans::get($p['active_featured_plan'] ?? '');
        $live = empty($p['suspended']) && !empty($p['verified']) && ($p['available'] ?? true) && ($fa || $grace['in_grace']);
        if ($fa) {
            $label = ($va ? 'VIP' : 'Featured').' · '.round(Time::daysLeft($fu, $now)).' days left';
        } elseif ($fu) {
            $label = 'Plan ended '.$fu->day.' '.$fu->format('M');
        } else {
            $label = 'No plan yet';
        }
        return [
            'featured_active' => $fa, 'vip_active' => $va,
            'featured_until' => Time::iso($fu), 'vip_until' => Time::iso($vu),
            'featured_days_left' => Time::daysLeft($fu, $now), 'vip_days_left' => Time::daysLeft($vu, $now),
            'plan_length' => $meta['label'] ?? null, 'plan_label' => $label, 'in_grace' => $grace['in_grace'], 'live' => $live,
        ];
    }

    /** Account type of the profile owner; for agency companions also the agency name. */
    public static function owner(?string $userId): array
    {
        $u = $userId ? DB::table('users')->where('user_id', $userId)->first() : null;
        $user = $u ? Auth::shape($u) : null;
        $isAgency = ($user['account_type'] ?? null) === 'agency';
        $agencyName = null;
        if ($isAgency) {
            $ag = Docs::first('agency_profiles', ['user_id' => $userId]);
            $agencyName = $ag['agency_name'] ?? null;
        }
        return ['user' => $user, 'owner_type' => $isAgency ? 'agency' : 'independent', 'agency_name' => $agencyName];
    }

    /** Remove a profile and the records that belong to it. */
    public static function deleteWithRelated(array $providerIds): void
    {
        if (!$providerIds) {
            return;
        }
        $in = ['in', $providerIds];
        Docs::delete('provider_profiles', ['provider_id' => $in]);
        foreach (['subscriptions', 'payment_transactions', 'verification_documents', 'enquiries', 'conversations'] as $t) {
            Docs::delete($t, ['provider_id' => $in]);
        }
    }
}
