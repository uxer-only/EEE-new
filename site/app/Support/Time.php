<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Dates. Everything is UTC. Inside documents dates are ISO 8601 strings
 * ("2026-10-16T08:00:00.000000+00:00"); in database columns they are "Y-m-d H:i:s".
 */
class Time
{
    public static function now(): CarbonImmutable
    {
        return CarbonImmutable::now('UTC');
    }

    public static function parse($v): ?CarbonImmutable
    {
        if ($v === null || $v === '') {
            return null;
        }
        if ($v instanceof \DateTimeInterface) {
            return CarbonImmutable::instance($v)->utc();
        }
        try {
            // Strings without a time zone are UTC.
            return CarbonImmutable::parse((string) $v, 'UTC')->utc();
        } catch (\Throwable) {
            return null;
        }
    }

    /** ISO string for documents and API answers. */
    public static function iso($v): ?string
    {
        $t = self::parse($v);
        return $t ? $t->format('Y-m-d\TH:i:s.uP') : null;
    }

    /** Value for a database column. */
    public static function col($v): ?string
    {
        $t = self::parse($v);
        return $t ? $t->format('Y-m-d H:i:s') : null;
    }

    /** Days from now until $v, rounded to 2 decimals, never below 0. */
    public static function daysLeft($v, ?CarbonImmutable $now = null): float
    {
        $t = self::parse($v);
        if (!$t) {
            return 0;
        }
        $now ??= self::now();
        return max(0, round(($t->getTimestamp() + $t->micro / 1e6 - $now->getTimestamp() - $now->micro / 1e6) / 86400, 2));
    }

    /** True when $v is a date later than $now. */
    public static function after($v, ?CarbonImmutable $now = null): bool
    {
        $t = self::parse($v);
        return $t !== null && $t->greaterThan($now ?? self::now());
    }
}
