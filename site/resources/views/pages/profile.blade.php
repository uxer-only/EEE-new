@php
    use App\Support\{Icon, Site};

    $id = $p['provider_id'];
    $c = is_array($p['characteristics'] ?? null) ? $p['characteristics'] : [];
    $contact = is_array($p['contact'] ?? null) ? $p['contact'] : [];
    $city = $p['location']['city'] ?? '';
    $country = $p['location']['country'] ?? '';
    $langs = is_array($c['languages'] ?? null) ? $c['languages'] : [];
    $avail = ['incall' => 'Incall', 'outcall' => 'Outcall', 'both' => 'Incall and outcall'][$p['availability_type'] ?? ''] ?? '';
    [$she, $replies] = ($p['gender'] ?? '') === 'female' ? ['She', 'replies'] : (($p['gender'] ?? '') === 'male' ? ['He', 'replies'] : ['They', 'reply']);
    $vip = Site::isVip($p);
    $phone = (string) ($contact['phone'] ?? '');
    $email = (string) ($contact['email'] ?? '');
    $name = $p['display_name'];
    $bio = $p['bio'] ?? ($p['essence'] ?? '');
    $bio = $bio ?: ($p['essence'] ?? '');

    $yesNo = fn ($v) => $v === 'yes' || $v === true ? 'Yes' : ($v === 'no' || $v === false ? 'No' : ($v ?? ''));
    $appearance = array_filter([
        ['Nationality', $c['nationality'] ?? ''], ['Ethnicity', $c['ethnicity'] ?? ''], ['Orientation', $c['orientation'] ?? ''],
        ['Height', !empty($c['height']) ? $c['height'].' cm' : ''], ['Weight', !empty($c['weight']) ? $c['weight'].' kg' : ''],
        ['Eye color', $c['eye_color'] ?? ''], ['Hair color', $c['hair_color'] ?? ''], ['Hair length', $c['hair_length'] ?? ''],
        ['Breast size', $c['breast_size'] ?? ''], ['Breast type', $c['breast_type'] ?? ''], ['Pubic hair', $c['pubic_hair'] ?? ''],
        ['Languages', implode(', ', $langs)], ['Tattoos', $yesNo($c['tattoos'] ?? null)], ['Piercings', $yesNo($c['piercings'] ?? null)],
        ['Smoker', $yesNo($c['smoker'] ?? null)], ['Available for', $avail],
    ], fn ($row) => $row[1] !== '' && $row[1] !== null);

    // Services: included and extras
    $services = [];
    if (array_is_list($p['services'] ?? [1]) && is_array($p['services'] ?? null)) {
        $services = array_map(fn ($n) => ['name' => $n, 'extra' => false, 'price' => null], $p['services']);
    } elseif (is_array($p['services'] ?? null)) {
        foreach ($p['services'] as $n => $v) {
            if (is_array($v) && !empty($v['type'])) {
                $services[] = ['name' => (string) $n, 'extra' => $v['type'] === 'extra', 'price' => $v['price'] ?? null];
            }
        }
    }
    $included = array_values(array_filter($services, fn ($s) => !$s['extra']));
    $extras = array_values(array_filter($services, fn ($s) => $s['extra']));

    // Rates
    $r = is_array($p['rates'] ?? null) ? $p['rates'] : [];
    $sym = ['EUR' => '€', 'USD' => '$', 'GBP' => '£', 'CHF' => 'CHF ', 'AUD' => 'A$', 'CAD' => 'C$', 'JPY' => '¥', 'AED' => 'AED ', 'SGD' => 'S$', 'HKD' => 'HK$'][$r['currency'] ?? ''] ?? '€';
    $money = fn ($v) => $sym.(is_numeric($v) ? number_format((float) $v, 0, '.', ',') : $v);
    $set = fn ($v) => $v !== null && $v !== '';
    $collect = function ($col) use ($set) {
        $col = is_array($col) ? $col : [];
        $out = [];
        foreach ([['1hour', 1, '1 hour'], ['2hours', 2, '2 hours'], ['3hours', 3, '3 hours']] as [$k, $h, $label]) {
            if (array_key_exists($k, $col) && $set($col[$k])) {
                $out["h$h"] = ['label' => $label, 'sort' => $h, 'v' => $col[$k]];
            }
        }
        foreach (is_array($col['extras'] ?? null) ? $col['extras'] : [] as $ex) {
            $h = (int) ($ex['hours'] ?? 0);
            if ($h > 0 && array_key_exists('price', $ex) && $ex['price'] !== '') {
                $out["h$h"] = ['label' => "$h hours", 'sort' => $h, 'v' => $ex['price']];
            }
        }
        if (array_key_exists('overnight', $col) && $set($col['overnight'])) {
            $out['overnight'] = ['label' => 'Overnight', 'sort' => 900, 'v' => $col['overnight']];
        }
        if (array_key_exists('taxi', $col) && $set($col['taxi'])) {
            $out['taxi'] = ['label' => 'Taxi (not included)', 'sort' => 999, 'v' => $col['taxi']];
        }
        return $out;
    };
    $rateRows = [];
    if (!empty($r['incall']) || !empty($r['outcall'])) {
        $a = $collect($r['incall'] ?? []);
        $b = $collect($r['outcall'] ?? []);
        foreach (array_unique(array_merge(array_keys($a), array_keys($b))) as $k) {
            $base = $a[$k] ?? $b[$k];
            $rateRows[] = ['key' => $k, 'label' => $base['label'], 'sort' => $base['sort'], 'incall' => $a[$k]['v'] ?? null, 'outcall' => $b[$k]['v'] ?? null];
        }
        usort($rateRows, fn ($x, $y) => $x['sort'] <=> $y['sort']);
    }

    // Schedule
    $days = ['monday' => 'Monday', 'tuesday' => 'Tuesday', 'wednesday' => 'Wednesday', 'thursday' => 'Thursday', 'friday' => 'Friday', 'saturday' => 'Saturday', 'sunday' => 'Sunday'];
    $sched = is_array($p['schedule'] ?? null) ? $p['schedule'] : [];
    $hasSchedule = !empty($p['available247']) || count(array_filter(array_keys($days), fn ($d) => !empty($sched[$d]['available']))) > 0;

    // Gallery
    $media = array_merge(
        array_map(fn ($u) => ['url' => $u, 'video' => false], $p['photos'] ?? []),
        array_map(fn ($u) => ['url' => $u, 'video' => true], $p['videos'] ?? []),
    );
    $N = count($media);
    $cur = $media[0] ?? null;

    // Phone number shown as +32 XXX XX XX XX until "Show number" is pressed
    $mask = function (string $raw) {
        if ($raw === '') {
            return '';
        }
        if (preg_match('/^(\+\d{2})\s?(.*)$/', preg_replace('/\s+/', ' ', $raw), $m)) {
            return $m[1].' XXX XX XX XX';
        }
        return preg_replace('/\d/', 'X', $raw);
    };
    $digits = fn ($s) => preg_replace('/[^0-9]/', '', (string) $s);
    $apps = [
        ['sms', 'SMS', '#8E8597', !empty($contact['hasSms']), 'sms:'.$phone, '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4 21l4.2-2c1.2.4 2.5.6 3.8.6 5.5 0 10-3.8 10-8.5S17.5 3 12 3z"></path></svg>'],
        ['whatsapp', 'WhatsApp', '#25D366', !empty($contact['hasWhatsapp']) || !empty($contact['whatsapp']), 'https://wa.me/'.$digits(($contact['whatsapp'] ?? '') ?: $phone), '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z"></path><path d="M9 9.5c.3 2 2.5 4.3 4.5 4.7l1.2-1.2 2 1-.6 1.6c-3.6.4-7.9-3.9-7.5-7.5L10.2 7.5l1 2z"></path></svg>'],
        ['telegram', 'Telegram', '#0088CC', !empty($contact['hasTelegram']) || !empty($contact['telegram']), 'https://t.me/'.ltrim((string) ($contact['telegram'] ?? ''), '@'), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"></path><path d="m9 13 8-6"></path></svg>'],
        ['signal', 'Signal', '#3A76F0', !empty($contact['hasSignal']) || !empty($contact['signal']), 'https://signal.me/#p/+'.$digits(($contact['signal'] ?? '') ?: $phone), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"></circle><circle cx="12" cy="12" r="4" fill="#fff" stroke="none"></circle></svg>'],
        ['viber', 'Viber', '#7360F2', !empty($contact['hasViber']) || !empty($contact['viber']), 'viber://chat?number='.rawurlencode('+'.$digits(($contact['viber'] ?? '') ?: $phone)), '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c5 0 8 2.5 8 7.5S17 18 12 18h-1l-3 3v-3.5C5.5 16.5 4 14 4 10.5 4 5.5 7 3 12 3z"></path><path d="M10 8c0 2.5 1.5 4 4 4.5l.8-1 1.4.8"></path></svg>'],
    ];

    // Page title, description and search-engine data
    $titleName = $name.(!empty($p['age']) ? ', '.$p['age'] : '');
    $pageTitle = $city ? "$titleName – Elite escort in $city" : "$titleName – Elite escort";
    $desc = Site::clip($bio, 160) ?: $name.' is an elite escort'.($city ? " in $city" : '').'. See photos, rates and availability, and get in touch directly.';
    $crumbs = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => array_values(array_filter([
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Elite Escorts', 'item' => Site::url('/browse')],
        $city ? ['@type' => 'ListItem', 'position' => 2, 'name' => $city, 'item' => Site::url('/browse?city='.rawurlencode($city))] : null,
        ['@type' => 'ListItem', 'position' => $city ? 3 : 2, 'name' => $name, 'item' => Site::url('/providers/'.$id)],
    ]))];
    $thumbCols = min(max($N, 5), 6);
    $client = [
        'provider_id' => $id, 'display_name' => $name, 'age' => $p['age'] ?? null, 'photos' => array_slice($p['photos'] ?? [], 0, 1),
        'location' => $p['location'] ?? null, 'verified' => !empty($p['verified']), 'media' => $media, 'phone' => $phone,
    ];
@endphp
@extends('layout', [
    'title' => $pageTitle,
    'description' => $desc,
    'canonical' => '/providers/'.$id,
    'ogType' => 'profile',
    'ogImage' => $p['photos'][0] ?? null,
    // Profiles whose plan has ended stay reachable by link but are kept out of search results.
    'robots' => !empty($p['featured_active']) || !empty($p['in_grace']) ? null : 'noindex, follow',
    'jsonLd' => $crumbs,
    'bg' => 'glow',
    'mainClass' => 'pub-profile',
    'css' => ['profile'],
    'js' => ['profile'],
])

@section('content')
<div class="x-wrap" id="profile">
<script type="application/json" id="profile-data">{!! Site::jsonLd($client) !!}</script>
<div class="pp-top"><nav aria-label="Breadcrumb" class="crumbs"><a href="/browse">Elite Escorts</a>{{ Icon::svg('chevright', 14) }}@if ($city)<a href="/browse?city={{ rawurlencode($city) }}">{{ $city }}</a>{{ Icon::svg('chevright', 14) }}@endif<span aria-current="page">{{ $name }}</span></nav><div class="pnavs" id="pnavs"></div></div>
<div class="pp-grid">
<div class="pp-left" data-testid="provider-detail-left-column">
<div class="pp-main" id="pp-main">
@if (!$cur)
<svg class="fig" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="60" cy="66" r="22" fill="#B58AA0"></circle><path d="M18 160c0-38 18-58 42-58s42 20 42 58z" fill="#B58AA0"></path></svg>
@elseif ($cur['video'])
<video src="{{ $cur['url'] }}" controls playsinline preload="metadata" class="media" data-testid="provider-video"></video><span class="vbadge">{{ Icon::svg('video') }}Video</span>
@else
<button type="button" class="mediabtn" data-lightbox aria-label="Open full-size photo" data-testid="open-lightbox-0"><img src="{{ $cur['url'] }}" alt="{{ $name }}, photo 1 of {{ $N }}" class="media" data-testid="provider-photo-0"></button><button type="button" class="round tr" aria-label="Open full-size photo" data-lightbox>{{ Icon::svg('expand') }}</button>
@endif
@if ($N > 1)<button type="button" class="round l" aria-label="Previous photo" data-go="-1">{{ Icon::svg('chevleft') }}</button><button type="button" class="round r" aria-label="Next photo" data-go="1">{{ Icon::svg('chevright') }}</button>@endif
@if ($cur && !$cur['video'])<span class="counter">1 / {{ $N }}</span>@endif
</div>
@if ($N > 1)
<div role="group" aria-label="Photos" class="pp-thumbs" id="pp-thumbs" style="grid-template-columns:repeat({{ $thumbCols }}, minmax(0, 1fr))">@foreach ($media as $i => $m)<button type="button" class="thumb{{ $i === 0 ? ' on' : '' }}" aria-label="Show {{ $m['video'] ? 'video' : 'photo' }} {{ $i + 1 }} of {{ $N }}" aria-pressed="{{ $i === 0 ? 'true' : 'false' }}" data-idx="{{ $i }}" data-testid="thumbnail-{{ $i }}">@if ($m['video'])<video src="{{ $m['url'] }}" muted preload="metadata"></video><span class="tplay">{{ Icon::svg('play', 14) }}</span><span class="tdur" hidden></span>@else<img src="{{ $m['url'] }}" alt="" loading="lazy">@endif</button>@endforeach</div>
@endif
</div>

<div class="pp-right">
<section aria-labelledby="pname" class="x-glass card"><div class="namerow"><h1 id="pname" data-testid="provider-name">{{ $titleName }}</h1><div class="badges">@if (!empty($p['verified']))<span class="b-ver" data-testid="verified-badge">{{ Icon::svg('check') }}Verified</span>@endif @if ($vip)<span class="b-vip">{{ Icon::svg('crown') }}VIP</span>@endif</div></div>
@if ($city || $country)<p class="loc">{{ Icon::svg('pin', 18) }}Elite escort based in {{ implode(', ', array_filter([$city, $country])) }}</p>@endif
@if ($bio)<div class="rule"></div><h2 class="eyebrow">About me</h2><p class="bio" data-testid="provider-bio">{{ $bio }}</p>@endif
@if ($avail || $langs)<div class="tags">@if ($avail)<span>{{ $avail }}</span>@endif @if ($langs)<span>{{ implode(', ', $langs) }}</span>@endif</div>@endif
</section>

@if ($appearance)
<section aria-labelledby="h-app" class="x-glass card"><h2 id="h-app" class="h">My appearance</h2><dl class="kv" data-testid="provider-characteristics">@foreach ($appearance as [$k, $v])<div data-testid="char-row-{{ strtolower(str_replace(' ', '-', $k)) }}"><dt>{{ $k }}</dt><dd>{{ $v }}</dd></div>@endforeach</dl></section>
@endif

@if ($phone || $email)
<section aria-labelledby="h-con" class="x-glass card connect" data-testid="contact-section"><h2 id="h-con" class="h">Let's connect</h2>
@if ($phone)
<div class="crow" data-testid="contact-phone"><span class="cic">{{ Icon::svg('phone') }}</span><div class="cval"><span class="clbl">Mobile</span><span class="num" id="phone-num"><span>{{ $mask($phone) }}</span><button type="button" class="shownum" id="show-phone" data-testid="show-phone-btn">Show number</button></span></div><div role="group" aria-label="Message apps" class="apps" data-testid="contact-channels">@foreach ($apps as [$key, $label, $bgc, $on, $href, $svg])@if ($on)<a href="{{ $href }}"@if ($key !== 'sms') target="_blank"@endif rel="noopener noreferrer" title="{{ $label }}" aria-label="Message {{ $name }} on {{ $label }}" style="background:{{ $bgc }}" data-testid="channel-{{ $key }}">{!! $svg !!}</a>@endif @endforeach</div></div>
@endif
@if ($email)
<a class="crow mail" href="mailto:{{ $email }}" data-testid="contact-email"><span class="cic">{{ Icon::svg('mail') }}</span><span class="cval"><span class="clbl">E-mail</span><span class="num">{{ $email }}</span></span></a>
@endif
</section>
@endif

@if ($services)
<section aria-labelledby="h-srv" class="x-glass card"><h2 id="h-srv" class="h">What we can share together</h2><div class="svc">@if ($included)<div><h3>Included</h3><ul>@foreach ($included as $s)<li>{{ $s['name'] }}</li>@endforeach</ul></div>@endif @if ($extras)<div><h3>Extras</h3><ul>@foreach ($extras as $s)<li class="ex">{{ $s['name'] }}@if ($s['price'] !== '' && $s['price'] !== null)<b>· +{{ $money($s['price']) }}</b>@endif</li>@endforeach</ul></div>@endif</div></section>
@endif

@if ($rateRows)
<section id="rates" aria-labelledby="h-rates" class="x-glass card"><h2 id="h-rates" class="h">Time &amp; investment</h2><table class="rates"><thead><tr><th scope="col">Duration</th><th scope="col">Incall</th><th scope="col">Outcall</th></tr></thead><tbody>@foreach ($rateRows as $row)<tr data-testid="rate-row-{{ $row['key'] }}"><th scope="row">{{ $row['label'] }}</th><td class="{{ $row['incall'] === null ? 'na' : '' }}">{{ $row['incall'] === null ? '—' : $money($row['incall']) }}</td><td class="{{ $row['outcall'] === null ? 'na' : '' }}">{{ $row['outcall'] === null ? '—' : $money($row['outcall']) }}</td></tr>@endforeach</tbody></table><p class="note">Prices in {{ $sym === '€' ? 'euro' : ($r['currency'] ?? '') }}. A dash means this option isn't offered.</p></section>
@endif

@if ($hasSchedule || !empty($p['booking_advance']) || !empty($p['worldwide_travel']))
<section aria-labelledby="h-sched" class="x-glass card"><h2 id="h-sched" class="h tight">My schedule</h2>
@if (!empty($p['booking_advance']))<div class="sline" data-testid="schedule-advance">{{ Icon::svg('clock') }}Booking in advance required</div>@endif
@if (!empty($p['worldwide_travel']))<div class="sline" data-testid="schedule-travel">{{ Icon::svg('globe') }}Available for worldwide travel</div>@endif
@if (!empty($p['available247']))
<ul class="days one" data-testid="schedule-247"><li><span class="d">All week</span><span class="t">Available 24/7</span></li></ul>
@elseif ($hasSchedule)
<ul class="days">@foreach ($days as $k => $label)@php $d = $sched[$k] ?? null; $on = $d && !empty($d['available']); @endphp<li data-testid="schedule-{{ $k }}"><span class="d">{{ $label }}</span><span class="{{ $on ? 't' : 't off' }}">{{ $on ? ($d['start'] ?? '').' – '.($d['end'] ?? '') : 'Not available' }}</span></li>@endforeach</ul>
@endif
</section>
@endif

<section id="request" aria-labelledby="h-req" class="x-glass card req"><h2 id="h-req" class="h tight">Do you have any requests?</h2>
<div role="status" class="sent" id="req-sent" hidden><span class="sic" aria-hidden="true">{{ Icon::svg('check', 18) }}</span><div><p class="t">Your request has been sent</p><p>Thank you. {{ $name }} has received your message and will reply by e-mail. Keep an eye on your inbox, and check your spam folder if you haven't heard back within a few days.</p><button type="button" class="txtbtn" id="req-again">Send another request</button></div></div>
<div id="req-form"><p class="sub">Your message goes straight to {{ $name }}. {{ $she }} {{ $replies }} by e-mail.</p><div class="two"><label><span>Your name</span><input class="gin" type="text" placeholder="Your name" autocomplete="name" name="req-name" data-testid="extra-request-name"></label><label><span>Your e-mail address</span><input class="gin" type="email" placeholder="your@email.com" autocomplete="email" name="req-email" data-testid="extra-request-email"></label></div><label class="msg"><span>Your message</span><textarea class="gin" maxlength="350" placeholder="Share your special requests or preferences…" name="req-message" data-testid="extra-request-input"></textarea></label><div class="sendrow"><span aria-live="polite" class="cnt" id="req-count">0/350 characters</span><button type="button" class="x-btn primary" disabled id="req-send" data-testid="send-request-button">{{ Icon::svg('send') }}<span>Send request</span></button></div></div>
</section>

<button type="button" class="reportbtn" id="report-open" data-testid="report-profile-button">{{ Icon::svg('flag') }}Report this profile as fake</button>
</div>
</div>
</div>
@endsection
