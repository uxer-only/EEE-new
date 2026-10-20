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
 *  - once an administrator exists it only sets a new admin e-mail and password (forgotten login);
 *  - at most 10 tries per minute.
 * After using it, remove the SETUP_TOKEN line from .env.
 */
class SetupController
{
    /**
     * null = page switched off; 'setup' = first setup (no admin yet); 'reset' = an admin exists: set a new
     * e-mail address and password for that admin (when the password is forgotten).
     * Only while SETUP_TOKEN (20+ characters) is in .env.
     */
    private function mode(): ?string
    {
        if (mb_strlen((string) config('eee.setup_token')) < 20) {
            return null;
        }
        try {
            $hasAdmin = Schema::hasTable('users') && DB::table('users')->where('role', 'admin')->exists();
        } catch (\Throwable $e) {
            $hasAdmin = false; // database not ready yet: the page shows the error when run
        }
        return $hasAdmin ? 'reset' : 'setup';
    }

    private function page(array $data, int $status = 200)
    {
        return response()->view('setup', $data + ['error' => null, 'done' => null, 'email' => '', 'mode' => $this->mode()], $status)
            ->header('X-Robots-Tag', 'noindex')->header('Cache-Control', 'no-store');
    }

    public function show()
    {
        if (!$this->mode()) {
            abort(404);
        }
        return $this->page([]);
    }

    public function run(Request $request)
    {
        $mode = $this->mode();
        if (!$mode) {
            abort(404);
        }
        $token = (string) $request->input('token');
        $email = mb_strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $again = (string) $request->input('password_again');
        $fail = fn ($msg) => $this->page(['error' => $msg, 'email' => $email], 422);

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

        if ($mode === 'reset') {
            return $this->reset($email, $password, $fail);
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

        return $this->page(['done' => ['email' => $email, 'reset' => false], 'email' => $email]);
    }

    /** Forgotten admin login: give the admin account this e-mail address and password, and log it out everywhere. */
    private function reset(string $email, string $password, \Closure $fail)
    {
        $existing = DB::table('users')->where('email', $email)->first();
        if ($existing && $existing->role !== 'admin') {
            return $fail("$email already has a {$existing->role} account. Use another e-mail address for the administrator.");
        }
        $admin = $existing ?: DB::table('users')->where('role', 'admin')->orderBy('id')->first();
        DB::table('users')->where('user_id', $admin->user_id)->update([
            'email' => $email, 'password_hash' => password_hash($password, PASSWORD_BCRYPT), 'email_verified' => true,
        ]);
        DB::table('user_sessions')->where('user_id', $admin->user_id)->delete();
        return $this->page(['done' => ['email' => $email, 'reset' => true], 'email' => $email]);
    }
}
