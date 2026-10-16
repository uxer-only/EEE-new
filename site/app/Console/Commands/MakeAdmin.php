<?php

namespace App\Console\Commands;

use App\Support\Api;
use App\Support\Time;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Creates an administrator account, or sets a new password for one.
 *     php artisan eee:admin you@example.com
 * The password is asked for and not shown while typing. Log in afterwards at /admin/login.
 */
class MakeAdmin extends Command
{
    protected $signature = 'eee:admin {email : E-mail address of the administrator} {--name=Administrator : Name shown in the admin screens}';
    protected $description = 'Create an administrator account (or change its password)';

    public function handle(): int
    {
        $email = mb_strtolower(trim($this->argument('email')));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL, FILTER_FLAG_EMAIL_UNICODE)) {
            $this->error('That is not a valid e-mail address.');
            return self::FAILURE;
        }
        $user = DB::table('users')->where('email', $email)->first();
        if ($user && $user->role !== 'admin') {
            $this->error("$email already has a {$user->role} account. Use another e-mail address for the administrator.");
            return self::FAILURE;
        }
        $password = (string) $this->secret('Password (at least 12 characters)');
        if (mb_strlen($password) < 12) {
            $this->error('The password must be at least 12 characters.');
            return self::FAILURE;
        }
        if ($password !== (string) $this->secret('Type the password again')) {
            $this->error('The two passwords are not the same.');
            return self::FAILURE;
        }
        $hash = password_hash($password, PASSWORD_BCRYPT);
        if ($user) {
            DB::table('users')->where('user_id', $user->user_id)->update(['password_hash' => $hash, 'email_verified' => true]);
            DB::table('user_sessions')->where('user_id', $user->user_id)->delete(); // log out everywhere
            $this->info("New password set for $email.");
        } else {
            DB::table('users')->insert([
                'user_id' => Api::id('user'),
                'email' => $email,
                'name' => $this->option('name'),
                'picture' => null,
                'role' => 'admin',
                'account_type' => null,
                'password_hash' => $hash,
                'email_verified' => true,
                'created_at' => Time::col(Time::now()),
            ]);
            $this->info("Administrator $email created. Log in at ".rtrim((string) config('eee.site_url'), '/').'/admin/login');
        }
        return self::SUCCESS;
    }
}
