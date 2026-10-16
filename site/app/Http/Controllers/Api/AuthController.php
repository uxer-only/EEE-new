<?php

namespace App\Http\Controllers\Api;

use App\Support\Api;
use App\Support\Auth;
use App\Support\Emails;
use App\Support\Mail;
use App\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** Accounts: register, log in/out, e-mail confirmation and password reset. */
class AuthController
{
    public function register(Request $request)
    {
        $b = Api::validate(Api::body($request), ['email' => 'email', 'password' => 'str', 'name' => 'str', 'role' => 'str', 'account_type' => '?str'], ['account_type' => 'independent']);
        $email = mb_strtolower(trim($b['email']));
        // Only advertiser (and visitor) accounts can be created here; admins are created on the server.
        if (!in_array($b['role'], ['provider', 'client'], true)) {
            Api::fail(400, 'Invalid account type');
        }
        if (strlen($b['password']) < 8) {
            Api::fail(400, 'Password must be at least 8 characters');
        }
        if (DB::table('users')->where('email', $email)->exists()) {
            Api::fail(400, 'Email already registered');
        }
        $userId = Api::id('user');
        $accountType = $b['role'] === 'provider' ? (in_array($b['account_type'], ['independent', 'agency'], true) ? $b['account_type'] : 'independent') : null;
        DB::table('users')->insert([
            'user_id' => $userId,
            'email' => $email,
            'name' => trim($b['name']),
            'picture' => null,
            'role' => $b['role'],
            'account_type' => $accountType,
            'password_hash' => password_hash($b['password'], PASSWORD_BCRYPT),
            'email_verified' => false,
            'created_at' => Time::col(Time::now()),
        ]);
        $u = DB::table('users')->where('user_id', $userId)->first();
        self::sendConfirmation($u, $request);
        $token = Auth::newSession($userId);
        $out = Auth::shape($u);
        unset($out['created_at']);
        return Api::json($out)->withCookie(Auth::cookie($request, $token));
    }

    public function login(Request $request)
    {
        $b = Api::validate(Api::body($request), ['email' => 'email', 'password' => 'str']);
        $u = DB::table('users')->where('email', mb_strtolower(trim($b['email'])))->first();
        if (!$u || !$u->password_hash || !password_verify($b['password'], $u->password_hash)) {
            Api::fail(401, 'Invalid credentials');
        }
        $token = Auth::newSession($u->user_id);
        $out = Auth::shape($u);
        unset($out['created_at']);
        return Api::json($out)->withCookie(Auth::cookie($request, $token));
    }

    public function me(Request $request)
    {
        return Api::json(Auth::user($request));
    }

    public function logout(Request $request)
    {
        if ($t = $request->cookie(Auth::COOKIE)) {
            DB::table('user_sessions')->where('session_token', $t)->delete();
        }
        return Api::json(['message' => 'Logged out successfully'])->withCookie(Auth::forget($request));
    }

    public function forgotPassword(Request $request)
    {
        $b = Api::validate(Api::body($request), ['email' => 'email']);
        $neutral = ['message' => "If an account exists for that email, we've sent a reset link."];
        $email = mb_strtolower(trim($b['email']));
        $u = DB::table('users')->where('email', $email)->first();
        if ($u && $u->password_hash) {
            DB::table('password_reset_tokens')->where('user_id', $u->user_id)->delete();
            $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
            $now = Time::now();
            DB::table('password_reset_tokens')->insert([
                'token' => $token, 'user_id' => $u->user_id, 'email' => $email,
                'expires_at' => Time::col($now->addHours(24)), 'used' => false, 'created_at' => Time::col($now),
            ]);
            $url = self::siteUrl($request).'/reset-password?token='.$token;
            if (Mail::enabled()) {
                Mail::send($email, 'Reset your Elite Escorts Europe password', Emails::passwordReset($u->name ?: 'there', $url));
            } else {
                Log::warning("RESEND_API_KEY not configured; reset link: $url");
            }
        }
        return Api::json($neutral);
    }

    public function resetPassword(Request $request)
    {
        $b = Api::validate(Api::body($request), ['token' => 'str', 'new_password' => 'str']);
        if (strlen($b['new_password']) < 8) {
            Api::fail(400, 'Password must be at least 8 characters');
        }
        $r = DB::table('password_reset_tokens')->where('token', $b['token'])->first();
        if (!$r || $r->used) {
            Api::fail(400, 'This reset link is invalid or has already been used.');
        }
        if (Time::parse($r->expires_at)->lessThan(Time::now())) {
            Api::fail(400, 'This reset link has expired. Please request a new one.');
        }
        DB::table('users')->where('user_id', $r->user_id)->update(['password_hash' => password_hash($b['new_password'], PASSWORD_BCRYPT)]);
        DB::table('password_reset_tokens')->where('token', $b['token'])->update(['used' => true, 'used_at' => Time::col(Time::now())]);
        DB::table('user_sessions')->where('user_id', $r->user_id)->delete();
        return Api::json(['message' => 'Password updated successfully. Please login with your new password.']);
    }

    public function verifyEmail(Request $request)
    {
        $token = (string) $request->query('token', '');
        $ok = ['message' => 'Your email has been confirmed. Welcome to Elite Escorts Europe!'];
        $r = $token !== '' ? DB::table('email_verification_tokens')->where('token', $token)->first() : null;
        if (!$r) {
            Api::fail(400, 'This confirmation link is invalid.');
        }
        $u = DB::table('users')->where('user_id', $r->user_id)->first();
        if ($r->used) {
            // A second click (or a link preview) on an already confirmed account still succeeds.
            if ($u && $u->email_verified) {
                return Api::json($ok);
            }
            Api::fail(400, 'This confirmation link has already been used.');
        }
        if (Time::parse($r->expires_at)->lessThan(Time::now())) {
            Api::fail(400, 'This confirmation link has expired. Please request a new one.');
        }
        DB::table('users')->where('user_id', $r->user_id)->update(['email_verified' => true]);
        DB::table('email_verification_tokens')->where('token', $token)->update(['used' => true, 'used_at' => Time::col(Time::now())]);
        return Api::json($ok);
    }

    public function resendVerification(Request $request)
    {
        $me = Auth::user($request);
        if ($me['email_verified']) {
            return Api::json(['message' => 'Your email is already verified.']);
        }
        self::sendConfirmation(DB::table('users')->where('user_id', $me['user_id'])->first(), $request);
        return Api::json(['message' => "We've sent you a new confirmation email. Please check your inbox."]);
    }

    // ------------------------------------------------------------------

    /** A new 24-hour confirmation link by e-mail (nothing when already confirmed). */
    private static function sendConfirmation(object $u, Request $request): void
    {
        if ($u->email_verified) {
            return;
        }
        DB::table('email_verification_tokens')->where('user_id', $u->user_id)->delete();
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $now = Time::now();
        DB::table('email_verification_tokens')->insert([
            'token' => $token, 'user_id' => $u->user_id, 'email' => $u->email,
            'expires_at' => Time::col($now->addHours(24)), 'used' => false, 'created_at' => Time::col($now),
        ]);
        $url = self::siteUrl($request).'/verify-email?token='.$token;
        $first = explode(' ', $u->name ?: 'there')[0];
        $p = config('eee.product_name');
        if (Mail::enabled()) {
            Mail::send($u->email, "Confirm your email for $p", Emails::confirmEmail($first, $url), [], "Anouchka from $p");
        } else {
            Log::warning("RESEND_API_KEY not configured; verification link: $url");
        }
    }

    /** Address used in links inside e-mails. */
    public static function siteUrl(Request $request): string
    {
        $configured = config('eee.site_url');
        return $configured ?: $request->getSchemeAndHttpHost();
    }
}
