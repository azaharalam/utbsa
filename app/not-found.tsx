import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 font-display text-6xl font-extrabold text-nil">404</p>
      <h1 className="mb-2 font-display text-2xl font-bold">That page is not here</h1>
      <p className="mb-6 max-w-sm text-sm text-ink-mid">
        The link may be old, or the event may have been taken down.
      </p>
      <Link href="/" className="rounded-lg bg-kantha px-5 py-2.5 text-sm font-semibold text-white">
        Back to the home page
      </Link>
    </div>
  );
}
