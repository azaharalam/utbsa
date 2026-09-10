/**
 * A staging site that looks identical to production is how someone records a
 * real payment in the wrong place. This makes it impossible to mistake.
 */
export default function StagingBanner() {
  if (process.env.STAGING !== 'true') return null;

  return (
    <div className="sticky top-0 z-50 bg-alta px-4 py-1.5 text-center text-xs font-semibold text-white">
      Staging — nothing here is real, and no email leaves this system.
      {process.env.NEXT_PUBLIC_PROD_URL && (
        <>
          {' '}
          <a href={process.env.NEXT_PUBLIC_PROD_URL} className="underline">
            Go to the live site
          </a>
        </>
      )}
    </div>
  );
}
