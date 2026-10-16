<?php

namespace App\Console\Commands;

use App\Support\Docs;
use App\Support\Emails;
use App\Support\Mail;
use App\Support\Time;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Background work, run every 6 hours by the scheduler (see routes/console.php and HOSTING.md):
 *  - e-mail advertisers whose listing ended and is now in the grace period (once per ended plan)
 *  - turn page views older than 90 days into daily totals
 *  - remove expired log-in sessions and e-mail links
 */
class Jobs extends Command
{
    protected $signature = 'eee:jobs';
    protected $description = 'Renewal e-mails, traffic totals and clean-up (run every 6 hours)';

    public function handle(): int
    {
        $this->info('Renewal notices sent: '.self::renewalNotices());
        $this->info('Days of page views turned into totals: '.self::rollupTraffic());
        $this->info('Expired sessions and links removed: '.self::cleanUp());
        return self::SUCCESS;
    }

    /** E-mail the owners of listings that lapsed into the grace period (once per lapse). */
    public static function renewalNotices(): int
    {
        $now = Time::now();
        $graceStart = $now->subDays((int) config('eee.grace_days'));
        $sent = 0;
        foreach (Docs::find('provider_profiles', ['featured_until' => ['<=', $now]]) as $p) {
            $until = Time::parse($p['featured_until']);
            if (!$until->greaterThan($graceStart) || ($p['renewal_notice_for'] ?? null) === $p['featured_until']) {
                continue;
            }
            $user = DB::table('users')->where('user_id', $p['user_id'])->first(['email', 'name']);
            if (!$user || !$user->email) {
                continue;
            }
            $url = rtrim((string) config('eee.site_url'), '/').'/subscribe?provider_id='.$p['provider_id'];
            $html = Emails::renewal($p['display_name'] ?? ($user->name ?: 'there'), $until->addDays((int) config('eee.grace_days')), $url);
            if (Mail::enabled() && !Mail::send($user->email, ($p['display_name'] ?? 'Your profile').' is due for renewal', $html)) {
                continue; // try again next time
            }
            Docs::update('provider_profiles', ['provider_id' => $p['provider_id']], [
                'renewal_notice_for' => $p['featured_until'],
                'renewal_notice_sent_at' => Time::iso($now),
            ]);
            $sent++;
        }
        return $sent;
    }

    /** Turn raw page views older than traffic_raw_days into daily totals, then delete the raw rows. */
    public static function rollupTraffic(): int
    {
        $cutoff = Time::now()->subDays((int) config('eee.traffic_raw_days'))->format('Y-m-d');
        $days = DB::table('traffic_logs')->where('day', '<', $cutoff)->distinct()->orderBy('day')->pluck('day')->filter()->all();
        foreach ($days as $day) {
            DB::transaction(function () use ($day) {
                $rows = DB::table('traffic_logs')->where('day', $day);
                $views = (clone $rows)->count();
                $visitors = (clone $rows)->whereNotNull('visitor')->distinct()->count('visitor');
                $pages = (clone $rows)->select('page', DB::raw('count(*) as n'))->groupBy('page')->orderByDesc('n')->limit(50)->pluck('n', 'page')->all();
                $old = DB::table('traffic_daily')->where('day', $day)->first();
                $merged = $old ? (json_decode($old->pages ?: '{}', true) ?: []) : [];
                foreach ($pages as $pg => $n) {
                    $merged[$pg ?: '/'] = ($merged[$pg ?: '/'] ?? 0) + $n;
                }
                DB::table('traffic_daily')->updateOrInsert(['day' => $day], [
                    'views' => ($old->views ?? 0) + $views,
                    'unique_visitors' => ($old->unique_visitors ?? 0) + $visitors,
                    'pages' => json_encode($merged, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                ]);
                DB::table('traffic_logs')->where('day', $day)->delete();
            });
        }
        return count($days);
    }

    /** Remove expired log-in sessions, e-mail links and location look-ups. */
    public static function cleanUp(): int
    {
        $now = Time::col(Time::now());
        $n = DB::table('user_sessions')->where('expires_at', '<', $now)->delete();
        foreach (['password_reset_tokens', 'email_verification_tokens'] as $t) {
            $n += DB::table($t)->where('expires_at', '<', $now)->delete();
        }
        DB::table('ip_geo_cache')->where('expires_at', '<', time())->delete();
        return $n;
    }
}
