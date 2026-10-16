@php
    use App\Support\{Icon, Site};
    $count = count($providers);
    $countText = $count === 1 ? '1 profile' : $count.' profiles';
    $seg = function (string $name, string $label, array $options, bool $wide = false) {
        $opts = array_merge([['', 'Any']], array_map(fn ($o) => is_array($o) ? $o : [$o, $o], $options));
        $h = '<div role="group" aria-label="'.e($label).'" class="ef-field'.($wide ? ' wide' : '').'"><span class="ef-lbl">'.e($label).'</span><div class="ef-seg" data-seg="'.e($name).'" data-testid="extra-'.e($name).'">';
        foreach ($opts as [$v, $l]) {
            $id = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $v === '' ? 'any' : $v));
            $on = $v === '';
            $h .= '<button type="button" data-value="'.e($v).'" aria-pressed="'.($on ? 'true' : 'false').'"'.($on ? ' class="on any"' : '').' data-testid="extra-'.e($name).'-'.e($id).'">'.e($l).'</button>';
        }
        return $h.'</div></div>';
    };
    $range = function (string $name, string $label, string $pre, string $unit, string $minPh, string $maxPh) {
        $box = function (string $side, string $ph) use ($name, $label, $pre, $unit) {
            $key = $side.'_'.$name;
            return '<span class="ef-box grow">'.($pre ? '<span class="pre">'.e($pre).'</span>' : '')
                .'<input type="number" inputmode="numeric" min="0" name="'.$key.'" placeholder="'.e($ph).'" aria-label="'.e($label).' '.($side === 'min' ? 'minimum' : 'maximum').'" class="ef-in no-spinner'.($pre ? ' haspre' : '').($unit ? ' hasunit' : '').'" data-testid="extra-'.$key.'">'
                .($unit ? '<span class="unit">'.e($unit).'</span>' : '').'</span>';
        };
        return '<div role="group" aria-label="'.e($label).'" class="ef-field"><span class="ef-lbl">'.e($label).'</span><div class="ef-range">'.$box('min', $minPh).'<span aria-hidden="true" class="dash">–</span>'.$box('max', $maxPh).'</div></div>';
    };
    $select = function (string $id, string $label, string $options, bool $wide = false) {
        return '<label class="ef-field'.($wide ? ' wide' : '').'"><span class="ef-lbl">'.e($label).'</span><span class="ef-box"><select id="'.$id.'" name="'.$id.'" class="ef-in sel" data-testid="extra-'.$id.'">'.$options.'</select>'.Icon::svg('chev', 16, 'class="chev"').'</span></label>';
    };
    $opts = fn (array $list, string $any = 'Any') => '<option value="">'.e($any).'</option>'.implode('', array_map(fn ($o) => '<option value="'.e($o).'">'.e($o).'</option>', $list));
    $serviceOpts = '<option value="">Any service</option>';
    foreach (Site::SERVICE_CATEGORIES as $c) {
        $serviceOpts .= '<optgroup label="'.e($c['label']).'">'.implode('', array_map(fn ($s) => '<option value="'.e($s).'">'.e($s).'</option>', $c['services'])).'</optgroup>';
    }
    $title = $city !== '' ? 'Elite escorts in '.$city : 'Browse elite escorts';
@endphp
@extends('layout', [
    'title' => $title,
    'description' => $city !== ''
        ? "Verified independent escorts and agency companions in $city. Browse profiles with photos, rates and availability, and contact them directly."
        : 'Browse verified independent escorts and agency companions across Europe. Filter by city, category, services, rates and appearance.',
    'canonical' => $city !== '' ? '/browse?city='.rawurlencode($city) : '/browse',
    'bg' => 'glow',
    'mainClass' => 'pub-browse',
    'js' => ['browse'],
])

@section('content')
<div class="x-wrap" id="browse" data-seed="{{ $seed }}">
<h1 class="title" data-testid="browse-title">Discover Excellence</h1>
<form role="search" aria-label="Find escorts" class="toolbar" id="browse-form">
<div role="group" aria-label="Category and filters" class="box cats" data-testid="filter-card">
@foreach ([['All', '', 'filter-all'], ['Female', 'female', 'filter-female'], ['Male', 'male', 'filter-male'], ['Trans', 'trans', 'filter-trans']] as [$l, $v, $t])<button type="button" class="seg{{ $v === '' ? ' on' : '' }}" aria-pressed="{{ $v === '' ? 'true' : 'false' }}" data-gender="{{ $v }}" data-testid="{{ $t }}">{{ $l }}</button>@endforeach
<span class="sep" aria-hidden="true"></span><button type="button" class="icon" aria-label="More filters" title="More filters" aria-haspopup="dialog" aria-expanded="false" id="filters-button" data-testid="filters-button">{{ Icon::svg('sliders') }}<span class="count" data-testid="extra-filters-count" hidden></span></button>
</div>
<label class="box near" id="near" data-testid="close-to-me-toggle"><input type="checkbox" id="near-input"><span class="txt"><span class="t1">Show escorts close to me</span><span class="t2" id="near-sub">Uses your device location</span></span>{{ Icon::svg('pin', 20) }}</label>
<div class="box find"><input type="search" name="city" aria-label="Search city or name" placeholder="Search city or name" value="{{ $city }}" data-testid="city-search-input"><button type="submit" class="go" aria-label="Search" data-testid="search-button">{{ Icon::svg('search', 20) }}</button></div>
<div role="dialog" aria-label="More filters" class="panel" id="filters-panel" data-testid="filters-panel" hidden>
<div class="phead"><h2>More filters</h2><button type="button" class="x" aria-label="Close filters" id="filters-close" data-testid="filters-close">{{ Icon::svg('close', 20) }}</button></div>
<div class="ef">
<section class="ef-sec"><h3>Services &amp; rates</h3><div class="ef-grid">{!! $select('service', 'Service', $serviceOpts, true) !!}{!! $range('rate', 'Rate for 1 hour', '€', '', '100', '500') !!}</div></section>
<section class="ef-sec"><h3>About</h3><div class="ef-grid">{!! $range('age', 'Age', '', 'yrs', '18', '60') !!}{!! $select('nationality', 'Nationality', $opts(Site::NATIONALITIES)) !!}{!! $select('ethnicity', 'Ethnicity', $opts(Site::ETHNICITIES)) !!}{!! $select('orientation', 'Orientation', $opts(Site::ORIENTATIONS)) !!}<div role="group" aria-label="Speaks" class="ef-field wide"><span class="ef-lbl">Speaks</span><div class="ef-pills" data-testid="extra-languages">@foreach (Site::LANGUAGES as $l)<button type="button" aria-pressed="false" data-lang="{{ $l }}" data-testid="extra-lang-{{ strtolower($l) }}">{{ $l }}</button>@endforeach</div></div></div></section>
<section class="ef-sec"><h3>Appearance</h3><div class="ef-grid">{!! $range('height', 'Height', '', 'cm', '150', '185') !!}{!! $range('weight', 'Weight', '', 'kg', '45', '75') !!}{!! $seg('breast_type', 'Breast type', Site::BREAST_TYPES) !!}{!! $seg('breast_size', 'Breast size', Site::BREAST_SIZES, true) !!}</div></section>
<section class="ef-sec"><h3>Other</h3><div class="ef-grid">{!! $seg('tattoos', 'Tattoos', [['yes', 'Yes'], ['no', 'No']]) !!}{!! $seg('piercings', 'Piercings', [['yes', 'Yes'], ['no', 'No']]) !!}{!! $seg('smoker', 'Smoker', [['yes', 'Yes'], ['no', 'No']]) !!}</div></section>
</div>
<div class="pfoot"><button type="button" class="txtbtn" id="filters-clear" data-testid="extra-filters-clear">Clear all</button><button type="button" class="x-btn primary" id="filters-apply" data-testid="apply-filters-button">Apply filters</button></div>
</div>
</form>
<div role="status" class="offline" id="offline" data-testid="offline-banner" hidden>You're offline — showing profiles you've recently viewed.</div>
<div class="meta" id="meta"><div class="left" id="chips" data-testid="active-filter-chips"><span aria-live="polite" class="cnt" id="count">{{ $countText }}</span></div><button type="button" class="txtbtn" id="chips-clear" data-testid="clear-filter-chips" hidden>Clear filters</button></div>
<div id="results">
@if ($count > 0)
<div class="x-tiles c6 results">@foreach ($providers as $i => $p){{ \App\Support\Site::tile($p, $i, 'provider-card-'.$i) }}@endforeach</div><p class="end">You've seen all {{ $countText }}</p>
@else
<div class="x-glass empty" data-testid="no-results"><span class="ic">{{ Icon::svg('search', 24) }}</span><h2>No providers found matching your criteria</h2><p>Try another city or name, choose a different category, or clear some filters.</p><button type="button" class="x-btn white" data-clear-all>Clear all filters</button></div>
@endif
</div>
</div>
@endsection
