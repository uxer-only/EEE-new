@extends('layout', [
    'title' => 'Elite Escorts Europe — Discreet, curated companionship',
    'titleAbsolute' => true,
    'description' => 'Browse verified independent escorts and agency companions in a discreet, premium directory. Contact them directly by phone, message or e-mail.',
    'canonical' => '/',
    'bg' => 'photo',
    'mainClass' => 'pub-home',
    'jsonLd' => ['@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => \App\Support\Site::NAME, 'url' => \App\Support\Site::url('/')],
])
@php use App\Support\Icon; @endphp

@section('content')
<section class="hero" aria-labelledby="hero-title" data-testid="hero-section"><span class="x-eyebrow">Discreet · Curated · Exceptional</span><h1 id="hero-title" class="x-serif" data-testid="hero-title">Bringing your secret desire<br><span>closer to you</span></h1><p data-testid="hero-subtitle">Connect with verified independent professionals in a safe, premium environment.</p><div class="ctas"><a class="x-btn lg primary" data-testid="hero-browse" href="/browse">Browse profiles {{ Icon::svg('arrow') }}</a><a href="/register/provider" class="x-btn lg glass" data-testid="hero-advertise">Advertise with us</a></div></section>

<section class="x-wrap latest" aria-labelledby="latest-title" data-testid="latest-profiles-section"><div class="x-sechead"><span class="x-eyebrow">Discover</span><h2 id="latest-title" class="x-h2">Latest profiles</h2></div><div class="x-tiles c5">@foreach ($providers as $i => $p){{ \App\Support\Site::tile($p, $i, 'profile-card-'.$i) }}@endforeach</div><div class="more"><a class="x-btn glass" data-testid="cta-browse-button" href="/browse">All profiles {{ Icon::svg('arrow') }}</a></div></section>

<section class="x-wrap why" aria-labelledby="why-title"><div class="x-sechead"><span class="x-eyebrow">Why Elite Escorts Europe</span><h2 id="why-title" class="x-h2">A curated, discreet directory</h2></div><div class="cards">
<div class="x-glass card"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"></path><path d="m9 12 2 2 4-4"></path></svg></span><h3>Verified profiles</h3><p>The green tick shows the advertiser has completed our verification, so you know the profile is genuine.</p></div>
<div class="x-glass card"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg></span><h3>Discreet by design</h3><p>Browse without an account and get in touch directly by phone, message or e-mail, on your own terms.</p></div>
<div class="x-glass card"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5z"></path></svg></span><h3>Why advertise with us</h3><p>Independent companions and agencies present themselves in a curated, premium environment.</p><a class="lnk" href="/advertising-prices">See advertisement plans {{ Icon::svg('arrow') }}</a></div>
</div></section>
@endsection
