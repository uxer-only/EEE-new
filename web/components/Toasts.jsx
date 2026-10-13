'use client';

import { Toaster } from 'sonner';

/** Toast messages (errors and confirmations), in the same colours as the React app. */
export default function Toasts() {
  return (
    <Toaster
      position="bottom-right"
      theme="system"
      toastOptions={{
        style: {
          background: 'hsl(210 10% 4%)',
          color: 'hsl(40 20% 95%)',
          borderColor: 'hsl(240 6% 15%)',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)',
        },
        classNames: { description: 'eee-toast-desc' },
      }}
    />
  );
}
