/* Small icon set used across the site (same as the React app's Shell.jsx). Safe to use in server and client components. */

export const Icon = {
  arrow: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  back: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
  ),
  crown: (p) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
  ),
  verified: ({ size = 14, ...p }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified" style={{ flexShrink: 0 }} {...p}><circle cx="12" cy="12" r="11" fill="#2F7A55" /><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  burger: (p) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  close: (p) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  pin: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
  ),
  search: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  ),
  check: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="m5 12 5 5 9-10" /></svg>
  ),
  info: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
};
