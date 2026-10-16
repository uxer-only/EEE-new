{{-- Shown when a page can't be built (for example when the database doesn't answer). Kept simple on purpose:
     it must work even when the rest of the site doesn't. --}}
@extends('layout', ['title' => "We couldn't load this page", 'robots' => 'noindex', 'bg' => 'glow', 'mainClass' => 'pub-browse', 'noAgeGate' => true])

@section('content')
<div class="x-wrap"><div role="alert" class="x-glass empty" style="margin-top:48px"><h1 style="font-size:24px;margin:0">We couldn't load this page</h1><p>Something went wrong on our side. Try again in a moment.</p><button type="button" class="x-btn white" onclick="location.reload()">Try again</button></div></div>
@endsection
