<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Sends e-mails through Resend (https://resend.com). Without RESEND_API_KEY nothing is sent. */
class Mail
{
    public static function enabled(): bool
    {
        return (bool) config('eee.resend_api_key');
    }

    /**
     * $to: one address or a list. Options: reply_to (address or list), attachments ([{filename, content(base64)}]).
     * Returns true when Resend accepted the e-mail.
     */
    public static function send(string|array $to, string $subject, string $html, array $options = [], ?string $fromName = null): bool
    {
        // Accounts of profiles added by the admin have no real address (see Profiles::MANAGED_DOMAIN).
        $to = array_values(array_filter((array) $to, fn ($a) => !str_ends_with(mb_strtolower((string) $a), '.invalid')));
        if (!$to) {
            return false;
        }
        if (!self::enabled()) {
            Log::warning('RESEND_API_KEY not configured; e-mail not sent', ['to' => $to, 'subject' => $subject]);
            return false;
        }
        $payload = [
            'from' => ($fromName ?? config('eee.product_name')).' <'.config('eee.sender_email').'>',
            'to' => (array) $to,
            'subject' => $subject,
            'html' => $html,
        ];
        if (!empty($options['reply_to'])) {
            $payload['reply_to'] = (array) $options['reply_to'];
        }
        if (!empty($options['attachments'])) {
            $payload['attachments'] = $options['attachments'];
        }
        try {
            $r = Http::withToken(config('eee.resend_api_key'))->timeout(15)->post('https://api.resend.com/emails', $payload);
            if (!$r->successful()) {
                Log::error('Resend send failed', ['to' => $to, 'status' => $r->status(), 'body' => $r->body()]);
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Log::error('Resend send failed: '.$e->getMessage(), ['to' => $to]);
            return false;
        }
    }
}
