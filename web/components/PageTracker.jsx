'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/api';

/** Counts one page view per page visited (the site's own counter: no cookies, no IP address stored). */
export default function PageTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    trackPageView(`${pathname}${search ? `?${search}` : ''}`);
  }, [pathname, search]);
  return null;
}
