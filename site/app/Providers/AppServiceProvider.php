<?php

namespace App\Providers;

use App\Support\Api;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Limits on log-in and account e-mails, so passwords can't be guessed by trying thousands in a row.
        // Counted per e-mail address (can't be dodged by changing IP) and per visitor IP.
        $tooMany = fn () => Api::json(['detail' => 'Too many attempts. Wait a minute and try again.'], 429);
        $email = fn (Request $r) => mb_strtolower(trim((string) $r->input('email')));
        RateLimiter::for('login', fn (Request $r) => [
            Limit::perMinute(10)->by('login-email:'.$email($r))->response($tooMany),
            Limit::perMinute(20)->by('login-ip:'.$r->ip())->response($tooMany),
        ]);
        RateLimiter::for('account-mail', fn (Request $r) => [
            Limit::perMinute(3)->by('mail-email:'.$email($r))->response($tooMany),
            Limit::perMinute(10)->by('mail-ip:'.$r->ip())->response($tooMany),
        ]);
    }
}
