<?php

namespace App\Support;

/** Helpers and option lists for the public pages (resources/views). */
class Site
{
    public const NAME = 'Elite Escorts Europe';
    public const EMAIL = 'info@eliteescortseurope.eu';

    /** Addresses handled by the React app in public/app (log in, register, dashboards, admin). */
    public const APP_ROUTES = [
        'login', 'admin', 'admin/{any}', 'register', 'register/{any}', 'verify-email', 'forgot-password',
        'reset-password', 'dashboard', 'dashboard/{any}', 'messages', 'subscribe', 'payment-success',
    ];

    /* Option lists for the Browse filters. Same lists as the React app (frontend/src/constants/companionData.js
       and frontend/src/components/CharacteristicsForm.jsx), so a filter always matches what advertisers can pick. */
    public const SERVICE_CATEGORIES = [
        ['id' => 'massage', 'label' => 'Massage', 'services' => ['Relaxing massage', 'Erotic massage', 'Couple massage', 'Body to body', 'Shower together']],
        ['id' => 'companionship', 'label' => 'Companionship & role-play', 'services' => ['GFE', 'Dirty talk', 'French kissing', 'Role-play', 'Uniform', 'Striptease', 'Duo with girl']],
        ['id' => 'intimate', 'label' => 'Intimate', 'services' => ['Classic sex', '69 position', 'Cunnilingus', 'Fingering', 'Handjob', 'Masturbation', 'Oral with condom', 'Oral without condom', 'Rimming', 'Greek', 'Sex toys', 'Squirting', 'Cum on face', 'Cum in mouth', 'Deepthroat', 'Facefuck', 'Swallowing', 'Facesitting', 'Porn star experience']],
        ['id' => 'couples', 'label' => 'Couples & groups', 'services' => ['Couples', 'With 2 men', 'Group sex', 'Double penetration']],
        ['id' => 'photos', 'label' => 'Photos & filming', 'services' => ['Casual photos', 'Erotic photos', 'Filming']],
        ['id' => 'fetish', 'label' => 'Fetish & BDSM', 'services' => ['Findom', 'BDSM - Femdom', 'Strapon service']],
    ];
    public const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
    public const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD+'];
    public const BREAST_TYPES = ['Natural', 'Enhanced'];
    public const ORIENTATIONS = ['Straight', 'Bi', 'Lesbian', 'Gay'];
    public const LANGUAGES = ['English', 'Dutch', 'French', 'German', 'Russian'];
    public const NATIONALITIES = [
        'Albanian', 'Algerian', 'American', 'Argentinian', 'Australian', 'Austrian',
        'Belarusian', 'Belgian', 'Brazilian', 'British', 'Bulgarian',
        'Canadian', 'Chilean', 'Chinese', 'Colombian', 'Croatian', 'Cuban', 'Czech',
        'Danish', 'Dominican', 'Dutch',
        'Egyptian', 'Estonian', 'Ethiopian',
        'Filipino', 'Finnish', 'French',
        'German', 'Ghanaian', 'Greek',
        'Hungarian',
        'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Irish', 'Israeli', 'Italian',
        'Japanese',
        'Kazakh', 'Kenyan', 'Korean',
        'Latvian', 'Lebanese', 'Lithuanian', 'Luxembourgish',
        'Malaysian', 'Mexican', 'Moroccan',
        'New Zealander', 'Nigerian', 'Norwegian',
        'Pakistani', 'Peruvian', 'Polish', 'Portuguese',
        'Romanian', 'Russian',
        'Serbian', 'Slovak', 'Slovenian', 'South African', 'Spanish', 'Swedish', 'Swiss', 'Syrian',
        'Thai', 'Tunisian', 'Turkish',
        'Ukrainian', 'Uzbek',
        'Venezuelan', 'Vietnamese',
        'Other',
    ];

    /** Colours for profiles without a photo (same as the tile in public/js/site.js). */
    public const TINTS = [
        ['#7A5468', '#3C2733', '#B58AA0'], ['#5E5476', '#2E2840', '#9A8DBA'], ['#4E6A5E', '#24332D', '#88AE9C'],
        ['#7A6048', '#3A2C20', '#C2A07C'], ['#74505C', '#36242B', '#B07F90'], ['#525A78', '#262A3C', '#8E98BC'],
    ];

    /** The public address of the site (APP_URL), without the last slash. */
    public static function url(string $path = ''): string
    {
        return rtrim((string) config('eee.site_url'), '/').$path;
    }

    public static function isVip(array $p): bool
    {
        if (isset($p['vip_active']) && is_bool($p['vip_active'])) {
            return $p['vip_active'];
        }
        return !empty($p['vip_until']) && Time::parse($p['vip_until'])->greaterThan(Time::now());
    }

    /** HTML of one profile tile (Home and Browse). Same markup as EEE.tile() in public/js/site.js, which Browse uses after filtering. */
    public static function tile(array $p, int $index, string $testId): \Illuminate\Support\HtmlString
    {
        $t = self::TINTS[$index % count(self::TINTS)];
        $photo = $p['photos'][0] ?? null;
        $meta = implode(' · ', array_filter([$p['age'] ?? null, $p['location']['city'] ?? null]));
        $vip = self::isVip($p);
        $verified = !empty($p['verified']);
        $label = $p['display_name'].($meta ? ', '.$meta : '').($verified ? ', verified' : '').($vip ? ', VIP' : '');
        $h = '<a class="x-tile" data-testid="'.e($testId).'" aria-label="'.e($label).'" href="/providers/'.e($p['provider_id']).'">'
            .'<div class="ph"'.($photo ? '' : ' style="background:linear-gradient(180deg, '.$t[0].' 0%, '.$t[1].' 100%)"').'>'
            .($photo
                ? '<img src="'.e($photo).'" alt="" loading="'.($index < 6 ? 'eager' : 'lazy').'">'
                : '<svg class="fig" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="60" cy="66" r="22" fill="'.$t[2].'"></circle><path d="M18 160c0-38 18-58 42-58s42 20 42 58z" fill="'.$t[2].'"></path></svg>')
            .($vip ? '<span class="x-vip">'.Icon::svg('crown').'VIP</span>' : '')
            .'<div class="bar"><div class="nm"><span>'.e($p['display_name']).'</span>'.($verified ? Icon::verified() : '').'</div>'
            .($meta ? '<div class="mt">'.e($meta).'</div>' : '').'</div></div></a>';
        return new \Illuminate\Support\HtmlString($h);
    }

    /** Shorten a text for a meta description, cutting at a word. */
    public static function clip(?string $text, int $max): string
    {
        $t = trim(preg_replace('/\s+/u', ' ', (string) $text));
        if (mb_strlen($t) <= $max) {
            return $t;
        }
        return preg_replace('/\s+\S*$/u', '', mb_substr($t, 0, $max - 1)).'…';
    }

    /** JSON for a <script type="application/ld+json"> block. */
    public static function jsonLd(array $data): string
    {
        return str_replace('<', '\\u003c', json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }
}
