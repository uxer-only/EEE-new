<?php

namespace App\Support;

use Illuminate\Support\HtmlString;

/**
 * The small icon set of the public pages, as inline SVG.
 * The same drawings are in public/js/site.js (EEE.icon) for parts the browser builds itself.
 */
class Icon
{
    private const PATHS = [
        'arrow' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M5 12h14M13 6l6 6-6 6"></path>'],
        'back' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M19 12H5M11 18l-6-6 6-6"></path>'],
        'crown' => [12, 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"', '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"></path>'],
        'burger' => [24, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"', '<path d="M4 7h16M4 12h16M4 17h16"></path>'],
        'close' => [24, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"', '<path d="M6 6l12 12M18 6 6 18"></path>'],
        'pin' => [16, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle>'],
        'search' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"', '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>'],
        'check' => [14, 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"', '<path d="m5 12 5 5 9-10"></path>'],
        'info' => [20, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path>'],
        'sliders' => [22, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"', '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"></path><circle cx="16" cy="6" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="18" cy="18" r="2"></circle>'],
        'smallx' => [14, 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"', '<path d="M6 6l12 12M18 6 6 18"></path>'],
        'chevright' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="m9 6 6 6-6 6"></path>'],
        'chevleft' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="m15 6-6 6 6 6"></path>'],
        'expand' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"></path>'],
        'play' => [26, 'fill="currentColor"', '<path d="M8 5.5v13l11-6.5z"></path>'],
        'phone' => [22, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"></path>'],
        'mail' => [22, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>'],
        'clock' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>'],
        'globe' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"></path>'],
        'send' => [18, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"></path>'],
        'flag' => [16, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>'],
        'upload' => [20, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path>'],
        'video' => [14, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3"></path>'],
        'chev' => [16, 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"', '<path d="m6 9 6 6 6-6"></path>'],
    ];

    /** An icon by name; $size changes width and height, $extra adds attributes (for example class="chev"). */
    public static function svg(string $name, ?int $size = null, string $extra = ''): HtmlString
    {
        [$def, $attrs, $body] = self::PATHS[$name];
        $s = $size ?? $def;
        $extra = $extra !== '' ? ' '.$extra : '';
        return new HtmlString("<svg{$extra} width=\"$s\" height=\"$s\" viewBox=\"0 0 24 24\" $attrs aria-hidden=\"true\">$body</svg>");
    }

    /** The green "verified" tick. */
    public static function verified(int $size = 14): HtmlString
    {
        return new HtmlString("<svg width=\"$size\" height=\"$size\" viewBox=\"0 0 24 24\" role=\"img\" aria-label=\"Verified\" style=\"flex-shrink:0\"><circle cx=\"12\" cy=\"12\" r=\"11\" fill=\"#2F7A55\"></circle><path d=\"m7 12.5 3.2 3.2L17 9\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg>");
    }
}
