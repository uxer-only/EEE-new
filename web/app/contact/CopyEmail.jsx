'use client';

import { useState } from 'react';

/** "Copy address" button on the Contact page. */
export default function CopyEmail({ email: EMAIL }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      window.prompt('Copy this address:', EMAIL); // clipboard blocked: let the visitor copy manually
    }
  };
  return (
    <button type="button" className="x-btn white" onClick={copy} data-testid="contact-copy-button">
      {copied ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F7A55" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
      )}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy address'}</span>
    </button>
  );
}
