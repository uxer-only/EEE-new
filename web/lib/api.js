/*
 * Browser-side calls to the FastAPI backend. Requests go to /api on the same domain;
 * next.config.mjs forwards them to the backend (API_URL).
 * Errors carry `response: { status, data }` like axios did in the React app, so lib/notify.js can explain them.
 */
const clean = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
);

async function request(method, path, { params, body } = {}) {
  const qs = params ? new URLSearchParams(clean(params)).toString() : '';
  let res;
  try {
    res = await fetch(`/api${path}${qs ? `?${qs}` : ''}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error('Network error');
    err.response = undefined;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const err = new Error(`Request failed with status ${res.status}`);
    err.response = { status: res.status, data };
    throw err;
  }
  return { data };
}

export const getMe = () => request('GET', '/auth/me');
export const logout = () => request('POST', '/auth/logout', { body: {} });
export const getProviders = (params) => request('GET', '/providers', { params });
export const reverseGeocode = (lat, lng) => request('GET', '/geo/reverse', { params: { lat, lng } });
export const createEnquiry = (data) => request('POST', '/enquiries', { body: data });
export const reportProvider = (data) => request('POST', '/reports', { body: data });
export const trackPageView = (page) => request('POST', '/track', { body: { page } }).catch(() => {});
