import { Suspense } from 'react';
import '@fontsource/manrope/300.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/600.css';
import '@/styles/base.css';
// Design system shared with the React app, so both apps always look the same.
import '../../frontend/src/styles/site.css';
import '../../frontend/src/styles/public.css';
import '@/styles/web.css';
import PageTracker from '@/components/PageTracker';
import Toasts from '@/components/Toasts';
import { SITE_URL, SITE_NAME } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: 'Elite Escorts Europe — Discreet. Curated. Exceptional companionship.',
  applicationName: SITE_NAME,
  appleWebApp: { title: SITE_NAME },
  icons: { icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }], apple: '/apple-touch-icon.png' },
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'en' },
  twitter: { card: 'summary_large_image' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0C',
};

// Runs before the page is shown: hides the age check for visitors who already confirmed,
// and removes the service worker an earlier version of the site installed.
const BOOT = `try{if(localStorage.getItem('ageConfirmed'))document.documentElement.classList.add('age-ok')}catch(e){}
try{if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <div className="App">{children}</div>
        <Suspense fallback={null}><PageTracker /></Suspense>
        <Toasts />
      </body>
    </html>
  );
}
