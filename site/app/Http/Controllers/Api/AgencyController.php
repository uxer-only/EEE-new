<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Plans;
use App\Support\Profiles;
use App\Support\Time;
use Illuminate\Http\Request;

/** Agency accounts: the agency defaults and the companion profiles it manages. */
class AgencyController
{
    public function profiles(Request $request)
    {
        $me = Auth::provider($request);
        $now = Time::now();
        $out = [];
        foreach (Docs::find('provider_profiles', ['user_id' => $me['user_id']], 'created_at', 'asc') as $p) {
            $fu = $p['featured_until'] ?? null;
            $fa = Time::after($fu, $now);
            $va = Time::after($p['vip_until'] ?? null, $now);
            [$done, $total, $selectable] = Profiles::completion($p);
            $loc = is_array($p['location'] ?? null) ? $p['location'] : [];
            $photos = $p['photos'] ?? [];
            $label = null;
            $autoRenew = true;
            if ($fa) {
                $meta = Plans::get($p['active_featured_plan'] ?? '');
                $label = ($meta['label'] ?? 'Featured').($va ? ' + VIP' : '');
                $sub = Docs::first('subscriptions', ['provider_id' => $p['provider_id']], 'created_at', 'desc');
                $autoRenew = $sub ? (bool) ($sub['auto_renew'] ?? true) : true;
            }
            $out[] = array_merge([
                'provider_id' => $p['provider_id'],
                'display_name' => ($p['display_name'] ?? '') ?: 'Untitled profile',
                'bio' => ($p['bio'] ?? '') ?: (($p['essence'] ?? '') ?: ''),
                'location' => $loc,
                'city' => $loc['city'] ?? null,
                'age' => $p['age'] ?? null,
                'photo' => $photos[0] ?? null,
                'verification_status' => $p['verification_status'] ?? 'pending',
                'verified' => (bool) ($p['verified'] ?? false),
                'featured_active' => $fa,
                'featured_until' => Time::iso($fu),
                'featured_days_left' => Time::daysLeft($fu, $now),
                'vip_active' => $va,
                'active_plan_label' => $label,
                'auto_renew' => $autoRenew,
            ], Profiles::grace($fu, $now), [
                'pending_plan' => $p['pending_plan'] ?? null,
                'completed_steps' => $done,
                'total_steps' => $total,
                'plan_selectable' => $selectable,
                'unread_enquiries' => Docs::count('enquiries', ['provider_id' => $p['provider_id'], 'read' => 0]),
            ]);
        }
        return Api::json(['profiles' => $out, 'account_type' => $me['account_type']]);
    }

    public function show(Request $request)
    {
        $me = Auth::provider($request);
        $doc = Docs::first('agency_profiles', ['user_id' => $me['user_id']]);
        if (!$doc) {
            return Api::json(['onboarded' => false]);
        }
        if (empty($doc['agency_id'])) {
            $doc['agency_id'] = Api::id('agency');
            Docs::update('agency_profiles', ['user_id' => $me['user_id']], ['agency_id' => $doc['agency_id']]);
        }
        $doc['onboarded'] = true;
        return Api::json($doc);
    }

    public function save(Request $request)
    {
        $me = Auth::provider($request);
        $data = Api::validate(Api::body($request), [
            'agency_name' => 'str', 'location' => '?dict', 'description' => '?str', 'languages' => '?strlist', 'contact' => '?dict',
            'default_services' => '?any', 'apply_services_to_all' => '?bool', 'default_rates' => '?dict', 'default_availability' => '?dict',
            'apply_rates_to_all' => '?bool', 'accepts_disabilities' => '?bool',
        ], ['location' => [], 'languages' => [], 'default_services' => [], 'apply_services_to_all' => false, 'default_rates' => [], 'apply_rates_to_all' => false, 'accepts_disabilities' => false]);
        $data['default_rates'] = Profiles::normalizeRates($data['default_rates']);
        $now = Time::iso(Time::now());
        Docs::upsert('agency_profiles', ['user_id' => $me['user_id']],
            array_merge(['user_id' => $me['user_id']], $data, ['onboarded' => true, 'updated_at' => $now]),
            ['created_at' => $now, 'agency_id' => Api::id('agency')]);

        if ($data['apply_services_to_all'] && $data['default_services']) {
            Docs::update('provider_profiles', ['user_id' => $me['user_id']], function ($p) use ($data) {
                $p['services'] = Profiles::applyServiceReview($data['default_services'], $p['services'] ?? null);
                $p['accepts_disabilities'] = $data['accepts_disabilities'];
                return $p;
            });
        }
        if ($data['apply_rates_to_all']) {
            $f = [];
            if ($data['default_rates']) {
                $f['rates'] = $data['default_rates'];
            }
            $da = $data['default_availability'] ?? [];
            foreach (['availability_type', 'schedule'] as $k) {
                if (!empty($da[$k])) {
                    $f[$k] = $da[$k];
                }
            }
            foreach (['available247', 'booking_advance'] as $k) {
                if (array_key_exists($k, $da)) {
                    $f[$k] = $da[$k];
                }
            }
            if ($f) {
                Docs::update('provider_profiles', ['user_id' => $me['user_id']], $f);
            }
        }
        return Api::json(['ok' => true, 'onboarded' => true]);
    }

    public function destroy(Request $request)
    {
        $me = Auth::provider($request);
        $ids = array_map(fn ($p) => $p['provider_id'], Docs::find('provider_profiles', ['user_id' => $me['user_id']]));
        Profiles::deleteWithRelated($ids);
        Docs::delete('agency_profiles', ['user_id' => $me['user_id']]);
        return Api::json(['message' => 'Agency profile deleted', 'profiles_removed' => count($ids)]);
    }

    /** Copy the agency defaults (services, rates, availability) onto every companion profile. */
    public function sync(Request $request)
    {
        $me = Auth::provider($request);
        $ag = Docs::first('agency_profiles', ['user_id' => $me['user_id']]);
        if (!$ag) {
            Api::fail(400, 'Set up your agency first');
        }
        $set = [];
        if (!empty($ag['default_services'])) {
            $set['services'] = $ag['default_services'];
        }
        if (!empty($ag['default_rates'])) {
            $set['rates'] = Profiles::normalizeRates($ag['default_rates']);
        }
        $da = is_array($ag['default_availability'] ?? null) ? $ag['default_availability'] : [];
        foreach (['availability_type', 'schedule'] as $k) {
            if (!empty($da[$k])) {
                $set[$k] = $da[$k];
            }
        }
        foreach (['available247', 'booking_advance', 'worldwide_travel'] as $k) {
            if (array_key_exists($k, $da)) {
                $set[$k] = $da[$k];
            }
        }
        if (array_key_exists('accepts_disabilities', $ag)) {
            $set['accepts_disabilities'] = (bool) $ag['accepts_disabilities'];
        }
        if (!$set) {
            return Api::json(['ok' => true, 'updated' => 0]);
        }
        $updated = Docs::update('provider_profiles', ['user_id' => $me['user_id']], function ($p) use ($set) {
            $f = $set;
            if (isset($f['services'])) {
                $f['services'] = Profiles::applyServiceReview($f['services'], $p['services'] ?? null);
            }
            return array_replace($p, $f);
        });
        return Api::json(['ok' => true, 'updated' => $updated]);
    }

    /** Queue (or clear) the plan a companion profile will be paid for at checkout. */
    public function plan(Request $request, string $providerId)
    {
        $me = Auth::provider($request);
        if (!Profiles::owned($me, $providerId)) {
            Api::fail(404, 'Profile not found');
        }
        $b = Api::validate(Api::body($request), ['featured_plan' => '?str', 'vip_plan' => '?str']);
        $pending = null;
        if ($b['featured_plan']) {
            $feat = Plans::AGENCY_PLANS[$b['featured_plan']] ?? null;
            if (!$feat || $feat['kind'] !== 'featured') {
                Api::fail(400, 'Invalid plan');
            }
            $vip = null;
            if ($b['vip_plan']) {
                $vp = Plans::AGENCY_PLANS[$b['vip_plan']] ?? null;
                if (!$vp || $vp['kind'] !== 'vip') {
                    Api::fail(400, 'Invalid VIP plan');
                }
                $vip = $b['vip_plan'];
            }
            $pending = ['featured_plan' => $b['featured_plan'], 'vip_plan' => $vip];
        }
        Docs::update('provider_profiles', ['provider_id' => $providerId], ['pending_plan' => $pending]);
        return Api::json(['ok' => true, 'pending_plan' => $pending]);
    }
}
