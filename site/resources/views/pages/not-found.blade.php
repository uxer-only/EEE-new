@extends('layout', ['title' => 'Page not found', 'robots' => 'noindex', 'bg' => 'glow', 'mainClass' => 'pub-browse'])

@section('content')
<div class="x-wrap"><div class="x-glass empty" style="margin-top:48px" data-testid="not-found"><span class="ic">{{ \App\Support\Icon::svg('search', 24) }}</span><h1 style="font-size:24px;margin:0">This page doesn't exist</h1><p>The profile may have been removed, or the link is wrong. Browse the profiles that are online now.</p><a class="x-btn white" href="/browse">Browse profiles</a></div></div>
@endsection
