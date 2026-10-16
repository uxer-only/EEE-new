<?php

/*
 * Scheduled work. The hosting needs one cron job that runs every minute (see HOSTING.md):
 *     * * * * * cd /path/to/site && php artisan schedule:run >> /dev/null 2>&1
 * Laravel then starts the jobs below at the right time.
 */

use Illuminate\Support\Facades\Schedule;

// Renewal e-mails, traffic totals and clean-up (app/Console/Commands/Jobs.php)
Schedule::command('eee:jobs')->everySixHours()->withoutOverlapping();
