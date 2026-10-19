<?php

namespace App\Http\Controllers;

use App\Support\Api;
use App\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One-time setup page (/setup) for hosting where you can't run commands in a terminal.
 * It does what these commands do:  php artisan migrate --force  and  php artisan eee:admin.
 * (No "optimize": then changes to .env made in a file manager keep working without a terminal.)
 *
 * Safety:
 *  - only works when SETUP_TOKEN is set in .env, and the code typed on the page matches it;
 *  - switches itself off for good as soon as an administrator account exists;
 *  - at most 10 tries per minute.
 * After using it, remove the SETUP_TOKEN line from .env.
 */
class SetupController
{
    private function available(): bool
    {
        if (!config('eee.setup_token')) {
            return false;
        }
        try {
            return !Schema::hasTable('users') || !DB::table('users')->where('role', 'admin')->exists();
        } catch (\Throwable $e) {
            return true; // database not ready yet: the page shows the error when run
        }
    }

    public function show()
    {
        if (!$this->available()) {
            abort(404);
        }
        return response()->view('setup', ['error' => null, 'done' => null, 'email' => ''])->header('X-Robots-Tag', 'noindex');
    }

    public function run(Request $request)
    {
        if (!$this->available()) {
            abort(404);
        }
        $token = (string) $request->input('token');
        $email = mb_strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $again = (string) $request->input('password_again');
        $fail = fn ($msg) => response()->view('setup', ['error' => $msg, 'done' => null, 'email' => $email], 422)->header('X-Robots-Tag', 'noindex');

        if (!hash_equals((string) config('eee.setup_token'), $token)) {
            return $fail('The setup code is not correct.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL, FILTER_FLAG_EMAIL_UNICODE)) {
            return $fail('That is not a valid e-mail address.');
        }
        if (mb_strlen($password) < 12) {
            return $fail('The password must be at least 12 characters.');
        }
        if ($password !== $again) {
            return $fail('The two passwords are not the same.');
        }

        try {
            Artisan::call('migrate', ['--force' => true]);
        } catch (\Throwable $e) {
            return $fail('The database could not be set up. Check DB_HOST, DB_DATABASE, DB_USERNAME and DB_PASSWORD in .env. ('.$e->getMessage().')');
        }

        $existing = DB::table('users')->where('email', $email)->first();
        if ($existing && $existing->role !== 'admin') {
            return $fail("$email already has a {$existing->role} account. Use another e-mail address for the administrator.");
        }
        $hash = password_hash($password, PASSWORD_BCRYPT);
        if ($existing) {
            DB::table('users')->where('user_id', $existing->user_id)->update(['password_hash' => $hash, 'email_verified' => true]);
        } else {
            DB::table('users')->insert([
                'user_id' => Api::id('user'), 'email' => $email, 'name' => 'Administrator', 'picture' => null,
                'role' => 'admin', 'account_type' => null, 'password_hash' => $hash, 'email_verified' => true,
                'created_at' => Time::col(Time::now()),
            ]);
        }

        return response()->view('setup', ['error' => null, 'done' => ['email' => $email], 'email' => $email])->header('X-Robots-Tag', 'noindex');
    }
}
