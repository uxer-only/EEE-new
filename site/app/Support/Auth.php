<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Log-in sessions. A session is a random token in the "session_token" cookie (or an
 * "Authorization: Bearer" header), valid for 7 days.
 */
class Auth
{
    public const COOKIE = 'session_token';
    public const DAYS = 7;

    /** The signed-in user as an array, or a 401 error. */
    public static function user(Request $request): array
    {
        $token = $request->cookie(self::COOKIE);
        if (!$token) {
            $h = (string) $request->header('Authorization');
            if (str_starts_with($h, 'Bearer ')) {
                $token = substr($h, 7);
            }
        }
        if (!$token) {
            Api::fail(401, 'Not authenticated');
        }
        $s = DB::table('user_sessions')->where('session_token', $token)->first();
        if (!$s) {
            Api::fail(401, 'Invalid session');
        }
        if (Time::parse($s->expires_at)->lessThan(Time::now())) {
            DB::table('user_sessions')->where('session_token', $token)->delete();
            Api::fail(401, 'Session expired');
        }
        $u = DB::table('users')->where('user_id', $s->user_id)->first();
        if (!$u) {
            Api::fail(401, 'User not found');
        }
        return self::shape($u);
    }

    /** The signed-in user, or null for visitors (used by the public pages' header). */
    public static function optional(Request $request): ?array
    {
        try {
            return self::user($request);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            return null;
        }
    }

    public static function provider(Request $request): array
    {
        $u = self::user($request);
        if ($u['role'] !== 'provider') {
            Api::fail(403, 'Provider access only');
        }
        return $u;
    }

    public static function admin(Request $request): array
    {
        $u = self::user($request);
        if ($u['role'] !== 'admin') {
            Api::fail(403, 'Admin access required');
        }
        return $u;
    }

    /** Public fields of a user row (never the password hash). */
    public static function shape(object $u): array
    {
        return [
            'user_id' => $u->user_id,
            'email' => $u->email,
            'name' => $u->name,
            'picture' => $u->picture,
            'role' => $u->role,
            'account_type' => $u->account_type,
            'email_verified' => (bool) $u->email_verified,
            'created_at' => Time::iso($u->created_at),
        ];
    }

    public static function newSession(string $userId): string
    {
        $token = 'session_'.bin2hex(random_bytes(16));
        $now = Time::now();
        DB::table('user_sessions')->insert([
            'session_token' => $token,
            'user_id' => $userId,
            'expires_at' => Time::col($now->addDays(self::DAYS)),
            'created_at' => Time::col($now),
        ]);
        return $token;
    }

    /** The session cookie: only readable by the server, sent to this site only. */
    public static function cookie(Request $request, string $token): Cookie
    {
        return Cookie::create(self::COOKIE, $token, time() + self::DAYS * 86400, '/', null,
            $request->isSecure(), true, false, Cookie::SAMESITE_LAX);
    }

    public static function forget(Request $request): Cookie
    {
        return Cookie::create(self::COOKIE, '', 1, '/', null, $request->isSecure(), true, false, Cookie::SAMESITE_LAX);
    }
}
