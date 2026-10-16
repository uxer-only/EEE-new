{{--
  Page frame of every public page: <head> (title, description, social previews), the background,
  header, footer and the age check. Each page sets the values below with @extends('layout', [...]).

  title       page title; " | Elite Escorts Europe" is added unless titleAbsolute is true
  description text for search engines and social previews
  canonical   the page's own address, for example "/browse"
  robots      for example "noindex" (leave out to allow indexing)
  ogType, ogImage, jsonLd, bg ('photo' | 'glow' | 'plain'), mainClass, noAgeGate, css (extra files), js (extra files)
--}}
@php
    use App\Support\Site;
    $fullTitle = !empty($titleAbsolute) ? $title : (isset($title) ? $title.' | '.Site::NAME : Site::NAME);
    $description = $description ?? 'Elite Escorts Europe — Discreet. Curated. Exceptional companionship.';
    $bg = $bg ?? 'glow';
    $v = '?v='.config('eee.asset_version');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>try{if(localStorage.getItem('ageConfirmed'))document.documentElement.classList.add('age-ok')}catch(e){}
try{if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}catch(e){}</script>
<meta name="theme-color" content="#0A0A0C">
<title>{{ $fullTitle }}</title>
<meta name="description" content="{{ $description }}">
<meta name="application-name" content="{{ Site::NAME }}">
@isset($robots)<meta name="robots" content="{{ $robots }}">
@endisset
@isset($canonical)<link rel="canonical" href="{{ Site::url($canonical === '/' ? '' : $canonical) }}">
@endisset
<meta name="apple-mobile-web-app-title" content="{{ Site::NAME }}">
<meta property="og:title" content="{{ $fullTitle }}">
<meta property="og:description" content="{{ $description }}">
@isset($canonical)<meta property="og:url" content="{{ Site::url($canonical) }}">
@endisset
<meta property="og:site_name" content="{{ Site::NAME }}">
<meta property="og:locale" content="en">
<meta property="og:type" content="{{ $ogType ?? 'website' }}">
@isset($ogImage)<meta property="og:image" content="{{ str_starts_with($ogImage, 'http') ? $ogImage : Site::url($ogImage) }}">
@endisset
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ $fullTitle }}">
<meta name="twitter:description" content="{{ $description }}">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
@if ($bg === 'photo')
<link rel="preload" as="image" href="/hero-bg-mobile.webp" media="(max-width: 767px)">
<link rel="preload" as="image" href="/hero-bg.webp" media="(min-width: 768px)">
@endif
@foreach (['fonts', 'base', 'site', 'public', 'web'] as $f)
<link rel="stylesheet" href="/css/{{ $f }}.css{{ $v }}">
@endforeach
@foreach ($css ?? [] as $f)
<link rel="stylesheet" href="/css/{{ $f }}.css{{ $v }}">
@endforeach
@isset($jsonLd)<script type="application/ld+json">{!! Site::jsonLd($jsonLd) !!}</script>
@endisset
</head>
<body>
<div class="App"><div class="x-page dark">
@if ($bg === 'photo')
<div class="x-photo" aria-hidden="true"><picture><source media="(max-width: 767px)" type="image/webp" srcset="/hero-bg-mobile.webp"><source media="(max-width: 767px)" srcset="/hero-bg-mobile.jpg"><source type="image/webp" srcset="/hero-bg.webp"><img src="/hero-bg.jpg" alt="" fetchpriority="high"></picture><div class="shade"></div><div class="dim"></div></div>
@elseif ($bg === 'glow')
<div class="x-glowbg" aria-hidden="true"></div>
@endif
@include('partials.nav')
<main class="x-main {{ $mainClass ?? '' }}">
@yield('content')
</main>
@include('partials.foot')
@if (empty($noAgeGate))
@include('partials.agegate')
@endif
</div></div>
@yield('after')
<script src="/js/site.js{{ $v }}"></script>
@foreach ($js ?? [] as $f)
<script src="/js/{{ $f }}.js{{ $v }}"></script>
@endforeach
</body>
</html>
