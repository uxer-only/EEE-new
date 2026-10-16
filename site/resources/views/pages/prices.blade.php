@php
    use App\Support\Icon;
    // Prices per profile (pp). Keep in sync with PLANS / AGENCY_PLANS in app/Support/Plans.php.
    $periods = [['7 days', '7d'], ['15 days', '15d'], ['1 month', '1m'], ['3 months', '3m']];
    $independent = [[30, 10], [50, 15], [90, 25], [240, 60]]; // [plan, optional VIP]
    $agency = [
        ['1–2 profiles', '1–2', [30, 50, 90, 240], false],
        ['3–6 profiles', '3–6', [25, 45, 80, 220], false],
        ['7 or more profiles', '7+', [20, 35, 65, 180], true],
    ];
    $per = fn ($long, $short) => '<span class="lg">'.e($long).'</span><span class="sh">'.e($short).'</span>';
@endphp
@extends('layout', [
    'title' => 'Advertisement plans and prices',
    'description' => 'Advertise as an independent escort or agency. Simple prices per profile for 7 days, 15 days, 1 month or 3 months, with an optional VIP upgrade.',
    'canonical' => '/advertising-prices',
    'bg' => 'photo',
    'mainClass' => 'pub-prices',
])

@section('content')
<div class="x-wrap" data-testid="advertising-prices-page">
<section class="intro"><div><span class="ey">Advertisement plans</span><h1>Simple, transparent pricing</h1><p>www.eliteescortseurope.eu charges the following rates per advertisement (1 advertisement = 1 profile). You pay once for the period you choose.</p><span class="upd">Elite Escorts Europe — last updated {{ date('Y') }}</span></div><a href="/register/provider" class="x-btn primary">Start advertising</a></section>

<section aria-labelledby="ind-h" class="x-glass card"><div class="head"><div><h2 id="ind-h">Independent escorts</h2><p>Price per profile (pp). Choose how long your advertisement stays live.</p></div></div>
<table class="pt" data-testid="price-table-independent"><caption>Prices for independent escorts per profile, by period</caption><thead><tr>@foreach ($periods as [$l, $s])<th scope="col">{!! $per($l, $s) !!}</th>@endforeach</tr></thead><tbody><tr>@foreach ($independent as [$price, $vip])<td><span class="pr">€{{ $price }} <small>/pp</small></span><span class="vip">{!! $per("VIP +€$vip (optional)", "VIP +€$vip") !!}</span></td>@endforeach</tr></tbody></table></section>

<section aria-labelledby="ag-h" class="x-glass card"><div class="head"><div><h2 id="ag-h">Agencies</h2><p>Price per profile (pp). The more profiles, the lower the price per profile.</p></div><span class="save">Save up to 25% per profile</span></div>
<table class="pt ag" data-testid="price-table-agency"><caption>Agency prices per profile, by number of profiles and period</caption><thead><tr><th scope="col">Profiles</th>@foreach ($periods as [$l, $s])<th scope="col">{!! $per($l, $s) !!}</th>@endforeach</tr></thead><tbody>@foreach ($agency as [$label, $short, $prices, $lowest])<tr><th scope="row"><span class="tl">{!! $per($label, $short) !!}@if ($lowest)<span class="low">Lowest price</span>@endif</span></th>@foreach ($prices as $v)<td>€{{ $v }} <small>/pp</small></td>@endforeach</tr>@endforeach</tbody></table>
<div class="note">{{ Icon::svg('info') }}<p>The number of profiles is the profiles that are live, plus the profiles you pay for at checkout.</p></div></section>

<section aria-labelledby="ref-h" class="x-glass card refund"><span class="ric" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7A2357" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l3 2"></path></svg></span><div><h2 id="ref-h">Refund policy</h2><p>Your satisfaction matters to us, so we offer a clear refund policy. You can request a refund within 48 hours of your purchase. Refunds are granted if you give a valid reason showing that the purchase was fraudulent or unauthorized, or if we decide at our discretion that a refund is appropriate in your case.</p><p>Contact us at <a href="mailto:info@eliteescortseurope.eu">info@eliteescortseurope.eu</a> to initiate a refund.</p></div></section>
</div>
@endsection
