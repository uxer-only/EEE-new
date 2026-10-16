<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * Card payments through Stripe Checkout (temporary).
 *
 * Stripe does not accept this kind of business, so this class is the one place to replace when a
 * high-risk payment provider is chosen: createCheckout(), status() and webhook() are all the rest of
 * the site uses.
 */
class Payments
{
    private static function key(): string
    {
        $k = config('eee.stripe_api_key');
        if (!$k) {
            Api::fail(500, 'Stripe is not configured');
        }
        return $k;
    }

    /** Start a payment. Returns ['session_id' => …, 'url' => page where the advertiser pays]. */
    public static function createCheckout(float $amount, string $currency, string $successUrl, string $cancelUrl, array $metadata): array
    {
        $form = [
            'mode' => 'payment',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'line_items[0][quantity]' => 1,
            'line_items[0][price_data][currency]' => $currency,
            'line_items[0][price_data][unit_amount]' => (int) round($amount * 100),
            'line_items[0][price_data][product_data][name]' => 'Elite Escorts Europe advertisement',
        ];
        foreach ($metadata as $k => $v) {
            $form["metadata[$k]"] = (string) $v;
        }
        $r = Http::withToken(self::key())->asForm()->timeout(20)->post('https://api.stripe.com/v1/checkout/sessions', $form);
        if (!$r->successful()) {
            Api::fail(502, 'The payment page could not be opened: '.($r->json('error.message') ?? 'payment provider error'));
        }
        return ['session_id' => $r->json('id'), 'url' => $r->json('url')];
    }

    /** Current state of a payment: payment_status ("paid", "unpaid"), status, amount_total, currency. */
    public static function status(string $sessionId): array
    {
        $r = Http::withToken(self::key())->timeout(20)->get('https://api.stripe.com/v1/checkout/sessions/'.urlencode($sessionId));
        if (!$r->successful()) {
            Api::fail(502, 'Could not check the payment: '.($r->json('error.message') ?? 'payment provider error'));
        }
        return [
            'payment_status' => $r->json('payment_status'),
            'status' => $r->json('status'),
            'amount_total' => $r->json('amount_total'),
            'currency' => $r->json('currency'),
        ];
    }

    /**
     * Read a webhook call from Stripe. When STRIPE_WEBHOOK_SECRET is set the signature is checked.
     * Returns ['session_id', 'payment_status', 'event_type', 'event_id'].
     */
    public static function webhook(string $body, ?string $signature): array
    {
        $secret = config('eee.stripe_webhook_secret');
        if ($secret) {
            $parts = [];
            foreach (explode(',', (string) $signature) as $kv) {
                [$k, $v] = array_pad(explode('=', $kv, 2), 2, '');
                $parts[$k][] = $v;
            }
            $ts = $parts['t'][0] ?? '';
            $expected = hash_hmac('sha256', $ts.'.'.$body, $secret);
            if (!$ts || !in_array($expected, $parts['v1'] ?? [], true) || abs(time() - (int) $ts) > 300) {
                Api::fail(400, 'Invalid signature');
            }
        }
        $evt = json_decode($body, true);
        if (!is_array($evt)) {
            Api::fail(400, 'Invalid payload');
        }
        $obj = $evt['data']['object'] ?? [];
        return [
            'session_id' => ($obj['object'] ?? '') === 'checkout.session' ? ($obj['id'] ?? null) : null,
            'payment_status' => $obj['payment_status'] ?? null,
            'event_type' => $evt['type'] ?? null,
            'event_id' => $evt['id'] ?? null,
        ];
    }
}
