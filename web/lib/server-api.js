/*
 * Server-side calls to the FastAPI backend, used while Next.js renders a page.
 * API_URL is the backend's own address (for example http://localhost:8001).
 */
import 'server-only';
import { visitorHeaders } from '@/lib/visitor';

const API_URL = (process.env.API_URL || 'http://localhost:8001').replace(/\/$/, '');

async function get(path, params, extraHeaders) {
  const qs = params ? new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString() : '';
  const res = await fetch(`${API_URL}/api${path}${qs ? `?${qs}` : ''}`, { cache: 'no-store', headers: extraHeaders });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend ${path} answered ${res.status}`);
  return res.json();
}

/** Visible profiles, in the backend's order. Returns [] when the backend is unreachable so pages still render. */
export async function listProviders(params = {}) {
  try {
    const data = await get('/providers', params, await visitorHeaders());
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[listProviders]', e.message);
    return [];
  }
}

/** One public profile, or null when it doesn't exist (or isn't visible). */
export async function getProvider(id) {
  return get(`/providers/${encodeURIComponent(id)}`);
}
