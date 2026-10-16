<?php

namespace App\Support;

/**
 * Advertisement plans and prices. The server decides every amount; the browser only picks a plan.
 * Keep the prices on the "Advertisement plans" page (resources/views/pages/prices.blade.php) in sync.
 */
class Plans
{
    public const CURRENCY = 'eur';

    public const PLANS = [
        'featured_2w' => ['label' => 'Featured · 2 weeks', 'amount' => 30.00, 'duration_days' => 14, 'kind' => 'featured'],
        'featured_4w' => ['label' => 'Featured · 4 weeks', 'amount' => 55.00, 'duration_days' => 28, 'kind' => 'featured'],
        'vip_2w' => ['label' => 'VIP · 2 weeks', 'amount' => 15.00, 'duration_days' => 14, 'kind' => 'vip'],
        'vip_4w' => ['label' => 'VIP · 4 weeks', 'amount' => 25.00, 'duration_days' => 28, 'kind' => 'vip'],
        // Independent advertiser plans (per profile)
        'featured_7d' => ['label' => 'Featured · 7 days', 'amount' => 30.00, 'duration_days' => 7, 'kind' => 'featured'],
        'featured_15d' => ['label' => 'Featured · 15 days', 'amount' => 50.00, 'duration_days' => 15, 'kind' => 'featured'],
        'featured_1m' => ['label' => 'Featured · 1 month', 'amount' => 90.00, 'duration_days' => 30, 'kind' => 'featured'],
        'featured_3m' => ['label' => 'Featured · 3 months', 'amount' => 240.00, 'duration_days' => 90, 'kind' => 'featured'],
        'vip_7d' => ['label' => 'VIP · 7 days', 'amount' => 10.00, 'duration_days' => 7, 'kind' => 'vip'],
        'vip_15d' => ['label' => 'VIP · 15 days', 'amount' => 15.00, 'duration_days' => 15, 'kind' => 'vip'],
        'vip_1m' => ['label' => 'VIP · 1 month', 'amount' => 25.00, 'duration_days' => 30, 'kind' => 'vip'],
        'vip_3m' => ['label' => 'VIP · 3 months', 'amount' => 60.00, 'duration_days' => 90, 'kind' => 'vip'],
        // Older agency per-profile plans
        'agency_featured_2w' => ['label' => 'Featured · 2 weeks', 'amount' => 30.00, 'duration_days' => 14, 'kind' => 'featured'],
        'agency_featured_4w' => ['label' => 'Featured · 4 weeks', 'amount' => 50.00, 'duration_days' => 28, 'kind' => 'featured'],
    ];

    /**
     * Agency plans: the price per profile depends on the agency's ACTIVE profiles at checkout
     * (live now + paid in this checkout, each counted once).
     *   t0 = 1–2 active profiles (standard price), t1 = 3–6 (agency price), t2 = 7+ (volume price)
     */
    public const AGENCY_PLANS = [
        'agency_7d' => ['label' => '7 days', 'duration_days' => 7, 'kind' => 'featured', 'price' => ['t0' => 30.00, 't1' => 25.00, 't2' => 20.00]],
        'agency_15d' => ['label' => '15 days', 'duration_days' => 15, 'kind' => 'featured', 'price' => ['t0' => 50.00, 't1' => 45.00, 't2' => 35.00]],
        'agency_1m' => ['label' => '1 month', 'duration_days' => 30, 'kind' => 'featured', 'price' => ['t0' => 90.00, 't1' => 80.00, 't2' => 65.00]],
        'agency_3m' => ['label' => '3 months', 'duration_days' => 90, 'kind' => 'featured', 'price' => ['t0' => 240.00, 't1' => 220.00, 't2' => 180.00]],
        'agency_vip_7d' => ['label' => 'VIP · 7 days', 'duration_days' => 7, 'kind' => 'vip', 'price' => ['t0' => 10.00, 't1' => 10.00, 't2' => 8.00]],
        'agency_vip_15d' => ['label' => 'VIP · 15 days', 'duration_days' => 15, 'kind' => 'vip', 'price' => ['t0' => 15.00, 't1' => 15.00, 't2' => 12.00]],
        'agency_vip_1m' => ['label' => 'VIP · 1 month', 'duration_days' => 30, 'kind' => 'vip', 'price' => ['t0' => 25.00, 't1' => 25.00, 't2' => 20.00]],
        'agency_vip_3m' => ['label' => 'VIP · 3 months', 'duration_days' => 90, 'kind' => 'vip', 'price' => ['t0' => 60.00, 't1' => 60.00, 't2' => 48.00]],
    ];

    public const TIER_MIN = 3;        // 3+ active profiles → agency price (t1)
    public const TIER_THRESHOLD = 7;  // 7+ active profiles → volume price (t2)

    public static function tier(int $active): string
    {
        if ($active >= self::TIER_THRESHOLD) {
            return 't2';
        }
        return $active >= self::TIER_MIN ? 't1' : 't0';
    }

    public static function agencyAmount(?string $plan, string $tier): float
    {
        $p = self::AGENCY_PLANS[$plan ?? ''] ?? null;
        if (!$p) {
            return 0.0;
        }
        return (float) ($p['price'][$tier] ?? $p['price']['t1']);
    }

    /** Any plan (independent or agency) by key. */
    public static function get(?string $key): ?array
    {
        return self::PLANS[$key ?? ''] ?? self::AGENCY_PLANS[$key ?? ''] ?? null;
    }
}
