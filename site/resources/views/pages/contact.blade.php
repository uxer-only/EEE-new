@php
    $email = \App\Support\Site::EMAIL;
    $ic = fn ($d) => '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A2357" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.$d.'</svg>';
    $mail = '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>';
    $info = [
        ['Response time', 'We typically respond within 24–48 hours, Monday to Friday.', '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>', 'contact-hours-card'],
        ['Privacy & discretion', 'Your messages are treated with the utmost confidentiality. We never share your details with third parties.', '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"></path><path d="m9 12 2 2 4-4"></path>', 'contact-privacy-card'],
        ['Reports & safety', 'To report a fake profile or a safety concern, include the profile link in your email so we can act quickly.', '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>', 'contact-reports-card'],
    ];
@endphp
@extends('layout', [
    'title' => 'Contact',
    'description' => 'Questions about advertising, your profile or a report? E-mail the Elite Escorts Europe team. We reply within 24–48 hours on working days.',
    'canonical' => '/contact',
    'bg' => 'photo',
    'mainClass' => 'pub-contact',
])

@section('content')
<div class="x-wrap" data-testid="contact-page">
<section class="intro"><span class="ey">Contact</span><h1>Contact us</h1><p>Have a question about advertising, your profile, a report, or anything else? We're here to help. Reach out and our team will get back to you as soon as possible.</p></section>
<div class="cols">
<section aria-labelledby="mail-h" class="x-glass card mail" data-testid="contact-email-card"><span class="bic">{!! $ic($mail) !!}</span><div class="txt"><h2 id="mail-h">Email</h2><p>For all enquiries, email us at</p><a href="mailto:{{ $email }}" class="addr" data-testid="contact-email-link">{{ $email }}</a></div><div class="acts"><a href="mailto:{{ $email }}" class="x-btn primary" data-testid="contact-send-email-button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{!! $mail !!}</svg>Send us an email</a><button type="button" class="x-btn white" data-copy="{{ $email }}" data-testid="contact-copy-button"><span class="ci"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg></span><span aria-live="polite">Copy address</span></button></div></section>
<div class="side">@foreach ($info as [$t, $txt, $d, $tid])<div class="x-glass card info" data-testid="{{ $tid }}"><span class="sic">{!! $ic($d) !!}</span><div><h2>{{ $t }}</h2><p>{{ $txt }}</p></div></div>@endforeach</div>
</div>
</div>
@endsection
