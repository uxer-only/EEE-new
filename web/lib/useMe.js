'use client';

/*
 * Who is signed in (advertiser or admin), for the header links.
 * Asked once per page load and shared between components; visitors without an account get null.
 */
import { useEffect, useState } from 'react';
import { getMe } from '@/lib/api';

let cached; // undefined = not asked yet, otherwise a promise of the user or null
let current = null;
const listeners = new Set();

function load() {
  if (!cached) cached = getMe().then((r) => r.data || null).catch(() => null).then((u) => { current = u; return u; });
  return cached;
}

export function useMe() {
  const [user, setLocal] = useState(current);
  useEffect(() => {
    let alive = true;
    listeners.add(setLocal);
    load().then((u) => { if (alive) setLocal(u); });
    return () => { alive = false; listeners.delete(setLocal); };
  }, []);
  const setUser = (u) => {
    current = u;
    cached = Promise.resolve(u);
    listeners.forEach((fn) => fn(u));
  };
  return { user, setUser };
}
