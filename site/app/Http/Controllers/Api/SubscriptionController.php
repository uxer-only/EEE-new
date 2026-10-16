<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Docs;
use App\Support\Payments;
use App\Support\Pdf;
use App\Support\Plans;
use App\Support\Profiles;
use App\Support\Time;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/** Buying plans (checkout), the payment result, plan status, auto-renew and invoices. */
class SubscriptionController
{
    public function checkout(Request $request)
    {
        $me = Auth::user($request);
        if ($me['role'] !== 'provider') {
            Api::fail(403, 'Only providers can purchase plans');
        }
        $b = Api::validate(Api::body($request), ['featured_plan' => 'str', 'vip_plan' => '?str', 'auto_renew' => '?bool', 'origin_url' => 'str', 'provider_id' => '?str'], ['auto_renew' => true]);
        $profile = Profiles::owned($me, $b['provider_id']);
        if (!$profile) {
            Api::fail(400, 'Create your profile before purchasing a plan');
        }
        $feat = Plans::PLANS[$b['featured_plan']] ?? null;
        if (!$feat || $feat['kind'] !== 'featured') {
            Api::fail(400, 'Invalid featured plan');
        }
        $vip = null;
        if ($b['vip_plan'] !== null) {
            $vip = Plans::PLANS[$b['vip_plan']] ?? null;
            if (!$vip || $vip['kind'] !== 'vip') {
                Api::fail(400, 'Invalid VIP plan');
            }
        }
        $total = round($feat['amount'] + ($vip['amount'] ?? 0.0), 2);
        $meta = [
            'user_id' => $me['user_id'], 'provider_id' => $profile['provider_id'], 'featured_plan' => $b['featured_plan'],
            'vip_plan' => $b['vip_plan'] ?? '', 'auto_renew' => $b['auto_renew'] ? '1' : '0', 'kind' => 'subscription_purchase',
        ];
        $origin = self::origin($request, $b['origin_url']);
        $s = Payments::createCheckout($total, Plans::CURRENCY, $origin.'/payment-success?session_id={CHECKOUT_SESSION_ID}', $origin.'/dashboard', $meta);
        Docs::insert('payment_transactions', [
            'session_id' => $s['session_id'], 'user_id' => $me['user_id'], 'provider_id' => $profile['provider_id'],
            'amount' => $total, 'currency' => Plans::CURRENCY, 'featured_plan' => $b['featured_plan'], 'vip_plan' => $b['vip_plan'],
            'auto_renew' => $b['auto_renew'], 'metadata' => $meta, 'payment_status' => 'pending', 'status' => 'open',
            'created_at' => Time::iso(Time::now()),
        ]);
        return Api::json(['url' => $s['url'], 'session_id' => $s['session_id'], 'amount' => $total, 'currency' => Plans::CURRENCY]);
    }

    /** One checkout for every agency profile with a queued plan. */
    public function bulk(Request $request)
    {
        $me = Auth::provider($request);
        $b = Api::validate(Api::body($request), ['origin_url' => 'str']);
        $raw = [];
        foreach (Docs::find('provider_profiles', ['user_id' => $me['user_id']]) as $p) {
            $pp = $p['pending_plan'] ?? null;
            if (is_array($pp) && isset(Plans::AGENCY_PLANS[$pp['featured_plan'] ?? ''])) {
                $raw[$p['provider_id']] = $pp;
            }
        }
        // Grade = live profiles + profiles paid for now, each counted once.
        $live = array_map(fn ($p) => $p['provider_id'], Docs::find('provider_profiles', ['user_id' => $me['user_id'], 'featured_until' => ['>', Time::now()]]));
        $active = count(array_unique(array_merge($live, array_keys($raw))));
        $tier = Plans::tier($active);
        $plans = [];
        $total = 0.0;
        foreach ($raw as $pid => $pp) {
            $amt = Plans::agencyAmount($pp['featured_plan'] ?? null, $tier);
            if (!empty($pp['vip_plan'])) {
                $amt += Plans::agencyAmount($pp['vip_plan'], $tier);
            }
            $total += $amt;
            $plans[] = ['provider_id' => $pid, 'featured_plan' => $pp['featured_plan'] ?? null, 'vip_plan' => $pp['vip_plan'] ?? null];
        }
        if (!$plans) {
            Api::fail(400, 'Select a plan for at least one profile first');
        }
        $total = round($total, 2);
        $meta = ['user_id' => $me['user_id'], 'kind' => 'agency_bulk', 'profile_count' => (string) count($plans), 'active_count' => (string) $active, 'tier' => $tier];
        $origin = self::origin($request, $b['origin_url']);
        $s = Payments::createCheckout($total, Plans::CURRENCY, $origin.'/payment-success?session_id={CHECKOUT_SESSION_ID}&agency=1', $origin.'/dashboard', $meta);
        Docs::insert('payment_transactions', [
            'session_id' => $s['session_id'], 'user_id' => $me['user_id'], 'provider_plans' => $plans,
            'provider_ids' => array_column($plans, 'provider_id'), 'amount' => $total, 'currency' => Plans::CURRENCY,
            'metadata' => $meta, 'payment_status' => 'pending', 'status' => 'open', 'created_at' => Time::iso(Time::now()),
        ]);
        return Api::json(['url' => $s['url'], 'session_id' => $s['session_id'], 'amount' => $total, 'currency' => Plans::CURRENCY, 'profile_count' => count($plans)]);
    }

    public function status(Request $request, string $sessionId)
    {
        $me = Auth::user($request);
        $tx = Docs::first('payment_transactions', ['session_id' => $sessionId]);
        if (!$tx) {
            Api::fail(404, 'Session not found');
        }
        if ($tx['user_id'] !== $me['user_id']) {
            Api::fail(403, 'Forbidden');
        }
        if (($tx['status'] ?? null) !== 'complete') {
            $cs = Payments::status($sessionId);
            Docs::update('payment_transactions', ['session_id' => $sessionId], [
                'payment_status' => $cs['payment_status'], 'stripe_status' => $cs['status'],
                'amount_total' => $cs['amount_total'], 'stripe_currency' => $cs['currency'],
            ]);
            if ($cs['payment_status'] === 'paid') {
                self::activate($sessionId);
            }
        }
        $tx = Docs::first('payment_transactions', ['session_id' => $sessionId]);
        $profiles = [];
        if (!empty($tx['provider_plans'])) {
            $ids = array_column($tx['provider_plans'], 'provider_id');
            $names = [];
            foreach (Docs::find('provider_profiles', ['provider_id' => ['in', $ids]]) as $d) {
                $names[$d['provider_id']] = $d['display_name'] ?? null;
            }
            foreach ($tx['provider_plans'] as $pp) {
                $profiles[] = ['provider_id' => $pp['provider_id'], 'name' => ($names[$pp['provider_id']] ?? null) ?: 'Companion',
                    'featured_plan' => $pp['featured_plan'] ?? null, 'vip_plan' => $pp['vip_plan'] ?? null];
            }
        }
        return Api::json([
            'session_id' => $sessionId, 'profiles' => $profiles, 'payment_status' => $tx['payment_status'] ?? null,
            'status' => $tx['status'] ?? null, 'amount' => $tx['amount'] ?? null, 'currency' => $tx['currency'] ?? null,
            'featured_plan' => $tx['featured_plan'] ?? null, 'vip_plan' => $tx['vip_plan'] ?? null,
        ]);
    }

    public function webhook(Request $request)
    {
        $evt = Payments::webhook($request->getContent(), $request->header('Stripe-Signature'));
        if ($evt['session_id'] && !config('eee.stripe_webhook_secret')) {
            // Unsigned call: don't trust what it says, ask Stripe for the real state of the payment.
            if (!Docs::count('payment_transactions', ['session_id' => $evt['session_id']])) {
                return Api::json(['received' => true]);
            }
            $evt['payment_status'] = Payments::status($evt['session_id'])['payment_status'];
        }
        if ($evt['session_id']) {
            Docs::update('payment_transactions', ['session_id' => $evt['session_id']], [
                'payment_status' => $evt['payment_status'], 'webhook_event_type' => $evt['event_type'], 'webhook_event_id' => $evt['event_id'],
            ]);
            if ($evt['payment_status'] === 'paid') {
                self::activate($evt['session_id']);
            }
        }
        return Api::json(['received' => true]);
    }

    public function me(Request $request)
    {
        $me = Auth::provider($request);
        $profile = Profiles::owned($me, $request->query('provider_id'));
        if (!$profile) {
            return Api::json(['has_profile' => false]);
        }
        $now = Time::now();
        $fu = $profile['featured_until'] ?? null;
        $vu = $profile['vip_until'] ?? null;
        $sub = Docs::first('subscriptions', ['provider_id' => $profile['provider_id']], 'created_at', 'desc');
        $g = Profiles::grace($fu, $now);
        return Api::json([
            'has_profile' => true,
            'featured_active' => Time::after($fu, $now), 'featured_until' => Time::iso($fu), 'featured_days_left' => Time::daysLeft($fu, $now),
            'in_grace' => $g['in_grace'], 'grace_days_left' => $g['grace_days_left'],
            'vip_active' => Time::after($vu, $now), 'vip_until' => Time::iso($vu), 'vip_days_left' => Time::daysLeft($vu, $now),
            'auto_renew' => $sub ? (bool) ($sub['auto_renew'] ?? true) : true,
            'plans' => Plans::PLANS,
        ]);
    }

    public function autoRenew(Request $request)
    {
        $me = Auth::provider($request);
        $profile = Profiles::owned($me, $request->query('provider_id'));
        if (!$profile) {
            Api::fail(404, 'Profile not found');
        }
        $b = Api::validate(Api::body($request), ['auto_renew' => 'bool']);
        $pid = $profile['provider_id'];
        // The preference lives on the newest subscription row; create one when there is none yet.
        if (!Docs::updateFirst('subscriptions', ['provider_id' => $pid], ['auto_renew' => $b['auto_renew']], 'created_at', 'desc')) {
            Docs::insert('subscriptions', ['provider_id' => $pid, 'auto_renew' => $b['auto_renew'], 'created_at' => Time::iso(Time::now())]);
        }
        return Api::json(['auto_renew' => $b['auto_renew']]);
    }

    public function invoices(Request $request)
    {
        $me = Auth::provider($request);
        $profile = Profiles::owned($me, $request->query('provider_id'));
        if (!$profile) {
            return Api::json(['invoices' => []]);
        }
        $out = [];
        foreach (Docs::find('payment_transactions', ['provider_id' => $profile['provider_id'], 'payment_status' => 'paid'], 'created_at', 'desc', 200) as $row) {
            $m = $row['metadata'] ?? [];
            $out[] = [
                'invoice_id' => $row['session_id'] ?? ($row['transaction_id'] ?? null),
                'amount' => self::amount($row),
                'currency' => strtoupper($row['currency'] ?? 'eur'),
                'plan' => $m['plan_id'] ?? ($m['kind'] ?? 'subscription_purchase'),
                'featured_id' => $m['featured_id'] ?? ($row['featured_plan'] ?? null),
                'vip_id' => $m['vip_id'] ?? ($row['vip_plan'] ?? null),
                'auto_renew' => ($m['auto_renew'] ?? null) === '1',
                'created_at' => Time::iso($row['created_at'] ?? ($row['completed_at'] ?? null)),
            ];
        }
        return Api::json(['invoices' => $out]);
    }

    public function invoicePdf(Request $request, string $invoiceId)
    {
        $me = Auth::provider($request);
        $owned = array_map(fn ($p) => $p['provider_id'], Docs::find('provider_profiles', ['user_id' => $me['user_id']]));
        if (!$owned) {
            Api::fail(404, 'Profile not found');
        }
        $tx = Docs::first('payment_transactions', ['session_id' => $invoiceId]);
        if (!$tx || !in_array($tx['provider_id'] ?? null, $owned, true)) {
            Api::fail(404, 'Invoice not found');
        }
        $m = $tx['metadata'] ?? [];
        $parts = [];
        if ($f = ($m['featured_id'] ?? null) ?: ($tx['featured_plan'] ?? null)) {
            $parts[] = 'Featured listing · '.(Plans::get($f)['label'] ?? $f);
        }
        if ($v = ($m['vip_id'] ?? null) ?: ($tx['vip_plan'] ?? null)) {
            $parts[] = 'VIP · '.(Plans::get($v)['label'] ?? $v);
        }
        if (!$parts) {
            $parts[] = (string) ($m['plan_id'] ?? 'Subscription purchase');
        }
        $ts = Time::parse($tx['completed_at'] ?? ($tx['created_at'] ?? null));
        $amount = sprintf('%s %.2f', strtoupper($tx['currency'] ?? 'eur'), self::amount($tx));
        $W = Pdf::WIDTH;
        $H = Pdf::HEIGHT;
        $pdf = (new Pdf())
            ->color('#832161')->font(true, 22)->text(22, $H - 30, 'Elite Escorts Europe')
            ->color('#DA4167')->font(true, 12)->text(22, $H - 38, 'INVOICE')
            ->color('#000000')->font(false, 10)
            ->text(22, $H - 55, "Invoice ID: $invoiceId")
            ->text(22, $H - 61, 'Date: '.($ts ? $ts->format('Y-m-d H:i').' UTC' : ''))
            ->text(22, $H - 67, "Provider: {$me['name']} ({$me['email']})")
            ->color('#4B4B4B')->rect(22, $H - 81, $W - 44, 8)
            ->color('#FFFFFF')->font(true, 10)->text(24, $H - 78.5, 'Description')->textRight($W - 24, $H - 78.5, 'Amount')
            ->color('#000000')->font(false, 10)->text(24, $H - 93, implode(' + ', $parts))->textRight($W - 24, $H - 93, $amount)
            ->color('#dbdadd')->line(22, $H - 105, $W - 22, $H - 105)
            ->color('#000000')->font(true, 11)->text(24, $H - 113, 'Total')->textRight($W - 24, $H - 113, $amount)
            ->color('#898989')->font(false, 8)->text(22, 20, 'Elite Escorts Europe · Bringing your secret desire closer to you')
            ->output();
        $disp = $request->query('inline') ? 'inline' : 'attachment';
        return response($pdf, 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => "$disp; filename=\"invoice-$invoiceId.pdf\""]);
    }

    // ------------------------------------------------------------------

    /** Paid amount in euro. Stripe reports amount_total in cents. */
    private static function amount(array $tx): float
    {
        if (isset($tx['amount'])) {
            return (float) $tx['amount'];
        }
        return isset($tx['amount_total']) ? $tx['amount_total'] / 100 : 0.0;
    }

    /** Where the payment page returns to: the site itself (the browser's address is only a fallback). */
    private static function origin(Request $request, string $fromBrowser): string
    {
        $site = config('eee.site_url');
        return rtrim($site ?: $fromBrowser ?: $request->getSchemeAndHttpHost(), '/');
    }

    /** Apply the paid plan(s) to the profile(s). Safe to call more than once. */
    public static function activate(string $sessionId): void
    {
        $tx = Docs::first('payment_transactions', ['session_id' => $sessionId]);
        if (!$tx || ($tx['status'] ?? null) === 'complete' || ($tx['payment_status'] ?? null) !== 'paid') {
            return;
        }
        $now = Time::now();
        $items = !empty($tx['provider_plans']) ? $tx['provider_plans']
            : [['provider_id' => $tx['provider_id'] ?? null, 'featured_plan' => $tx['featured_plan'] ?? null, 'vip_plan' => $tx['vip_plan'] ?? null]];
        foreach ($items as $pp) {
            self::applyPlan((string) ($pp['provider_id'] ?? ''), $pp['featured_plan'] ?? null, $pp['vip_plan'] ?? null, $now);
        }
        Docs::update('payment_transactions', ['session_id' => $sessionId], ['status' => 'complete', 'completed_at' => Time::iso($now)]);
    }

    /** Add the plan's days to the profile (on top of any time still left). */
    public static function applyPlan(string $providerId, ?string $featured, ?string $vip, CarbonImmutable $now): void
    {
        Docs::update('provider_profiles', ['provider_id' => $providerId], function ($p) use ($featured, $vip, $now) {
            if ($f = Plans::get($featured)) {
                $cur = Time::parse($p['featured_until'] ?? null);
                $base = $cur && $cur->greaterThan($now) ? $cur : $now;
                $p['featured_until'] = Time::iso($base->addDays($f['duration_days']));
                $p['active_featured_plan'] = $featured;
            }
            if ($vip && ($v = Plans::get($vip))) {
                $cur = Time::parse($p['vip_until'] ?? null);
                $base = $cur && $cur->greaterThan($now) ? $cur : $now;
                $p['vip_until'] = Time::iso($base->addDays($v['duration_days']));
                $p['active_vip_plan'] = $vip;
            }
            $p['pending_plan'] = null;
            return $p;
        });
    }
}
