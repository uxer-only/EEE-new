'use client';

import { PublicPage } from '@/components/site/Shell';

/** Shown when a page can't be built, for example when the backend doesn't answer. */
export default function ErrorPage({ reset }) {
  return (
    <PublicPage bg="glow" mainClass="pub-browse">
      <div className="x-wrap">
        <div role="alert" className="x-glass empty" style={{ marginTop: 48 }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>We couldn&apos;t load this page</h1>
          <p>Something went wrong on our side. Try again in a moment.</p>
          <button type="button" className="x-btn white" onClick={() => reset()}>Try again</button>
        </div>
      </div>
    </PublicPage>
  );
}
