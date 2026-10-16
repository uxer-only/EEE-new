{{-- Header. Who is signed in is known on the server (the log-in cookie), so the right links show straight away.
     Links to the React app (log in, advertise, dashboard) load that app; see public/app. --}}
@php
    try {
        $me = \App\Support\Auth::optional(request());
    } catch (\Throwable $e) {
        $me = null; // database not reachable: show the visitor links
    }
    $path = '/'.ltrim(request()->path(), '/');
    $items = $me
        ? [['/browse', 'Elite Escorts', false], [$me['role'] === 'admin' ? '/admin' : '/dashboard', 'Dashboard', false], [null, 'Log out', true]]
        : [['/browse', 'Elite Escorts', false], ['/login', 'Log in', false], ['/register/provider', 'Advertise', true]];
    $links = '';
    foreach ($items as [$to, $label, $cta]) {
        $cls = $cta ? 'x-snc' : 'x-sn';
        if ($to === null) {
            $links .= '<button type="button" class="'.$cls.'" data-logout>'.e($label).'</button>';
            continue;
        }
        $cur = ($path === $to || ($to !== '/' && str_starts_with($path, $to.'/'))) ? ' aria-current="page"' : '';
        $links .= '<a href="'.e($to).'" class="'.$cls.'"'.$cur.'>'.e($label).'</a>';
    }
@endphp
<header class="x-nav dark" data-testid="header"><span class="x-brand"><a class="x-logo" data-testid="logo-link" href="/">Elite Escorts Europe</a></span><nav aria-label="Main" class="x-navlinks">{!! $links !!}</nav><button type="button" class="x-burger" aria-label="Open menu" aria-expanded="false" aria-controls="x-menu" data-testid="mobile-menu-toggle"><span class="i-open">{{ \App\Support\Icon::svg('burger') }}</span><span class="i-close">{{ \App\Support\Icon::svg('close') }}</span></button></header>
<nav aria-label="Main" class="x-menu dark" id="x-menu" data-testid="mobile-menu" hidden>{!! $links !!}</nav>
