'use client';

import { useEffect } from 'react';

/**
 * Catches the errors that kill the whole page.
 *
 * The common one in production is a ChunkLoadError: the person has the site
 * open, we deploy, and the JavaScript chunk their tab is asking for no longer
 * exists on disk. Next builds new filenames every time, and nginx caches the
 * old ones as immutable, so the browser holds a reference to a file that has
 * been deleted.
 *
 * It is not really an error — the page is simply out of date. So reload it
 * once, and the person sees a brief flicker instead of a dead screen.
 *
 * The sessionStorage guard stops a reload loop if the problem is something
 * else entirely.
 */
const RELOAD_KEY = 'utbsa:reloaded-for-chunk-error';

function isStaleBuild(error: Error) {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|Importing a module script failed/i
    .test(`${error.name} ${error.message}`);
}

export default function GlobalError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isStaleBuild(error)) return;
    if (sessionStorage.getItem(RELOAD_KEY)) return;   // already tried
    sessionStorage.setItem(RELOAD_KEY, '1');
    window.location.reload();
  }, [error]);

  const stale = isStaleBuild(error);

  return (
    <html lang="en">
      <body style={{
        fontFamily: 'system-ui, sans-serif',
        background: '#FAF7F0', color: '#1E3050',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', margin: 0, padding: '1.5rem',
      }}>
        <div style={{ maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {stale ? 'Reloading…' : 'Something went wrong'}
          </h1>

          <p style={{ color: '#5B6270', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            {stale
              ? 'The site was updated while you had it open. Reloading to pick up the new version.'
              : 'Sorry — that did not work. Trying again usually fixes it.'}
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => { sessionStorage.removeItem(RELOAD_KEY); reset(); }}
              style={{
                minHeight: '44px', padding: '0 1rem', borderRadius: '0.5rem',
                background: '#1F6F55', color: 'white', border: 0,
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              }}>
              Try again
            </button>
            <a href="/"
              style={{
                minHeight: '44px', padding: '0 1rem', borderRadius: '0.5rem',
                border: '1.5px solid #1E3050', color: '#1E3050',
                fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}>
              Home
            </a>
          </div>

          {!stale && (
            <p style={{ color: '#5B6270', fontSize: '0.75rem', marginTop: '1.25rem' }}>
              If it keeps happening, tell the e-board — it helps to know.
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
