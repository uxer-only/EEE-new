@php
    $path = '/'.ltrim(request()->path(), '/');
    $cur = fn ($to) => $path === $to ? ' aria-current="page"' : '';
@endphp
<footer class="x-foot dark" data-testid="footer"><div class="copy"><span>© {{ date('Y') }} Elite Escorts Europe. All rights reserved.</span><span class="x-18">18+ only</span></div><nav aria-label="Footer"><a href="/terms"{!! $cur('/terms') !!} data-testid="footer-terms-link">Terms, Privacy &amp; Cookies</a><a href="/advertising-prices"{!! $cur('/advertising-prices') !!} data-testid="footer-advertising-link">Advertisement plans</a><a href="/contact"{!! $cur('/contact') !!} data-testid="footer-contact-link">Contact</a><a href="/admin/login" data-testid="footer-admin-link">Admin</a></nav></footer>
