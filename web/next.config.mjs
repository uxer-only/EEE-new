/*
 * Next.js serves the public pages (Home, Browse, profiles, plans, contact, terms).
 * Everything else — log in, register, dashboards, admin — is still the React app in ../frontend.
 * Its build is copied to public/app (npm run build:app) and served for those addresses below.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const API_URL = (process.env.API_URL || 'http://localhost:8001').replace(/\/$/, '');

// Addresses handled by the React app. Add a route here when you add a page to that app.
const APP_ROUTES = [
  '/login', '/admin', '/admin/:path*',
  '/register', '/register/:path*', '/verify-email', '/forgot-password', '/reset-password',
  '/dashboard', '/dashboard/:path*', '/messages', '/subscribe', '/payment-success',
];

export default {
  // Lets the pages import the shared styles from ../frontend/src/styles.
  turbopack: { root: path.join(here, '..') },
  poweredByHeader: false,
  async redirects() {
    return [
      // Agencies have no public page.
      { source: '/agency/:path*', destination: '/browse', permanent: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
        // Demo photos (only exist when the backend runs the demo, see demo/launch.py).
        { source: '/demo/:path*', destination: `${API_URL}/demo/:path*` },
      ],
      afterFiles: APP_ROUTES.map((source) => ({ source, destination: '/app/index.html' })),
    };
  },
  async headers() {
    return [
      // The React app's index.html must never be cached, so a new build is picked up straight away.
      { source: '/app/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      ...APP_ROUTES.map((source) => ({ source, headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'X-Robots-Tag', value: 'noindex' }] })),
    ];
  },
};
