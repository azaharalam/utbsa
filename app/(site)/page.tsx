import Link from 'next/link';
import { getCurrentMember } from '@/lib/session';
import { upcomingEvents, publishedPosts } from '@/lib/queries/content';
import { Card, Button, Pill } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const me = await getCurrentMember();
  const [events, posts] = await Promise.all([upcomingEvents(me, 1), publishedPosts(3)]);
  const next = events[0] ?? null;

  return (
    <>
      <section className="bg-nil px-4 py-12 text-muslin sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-3 font-display text-[2.35rem] font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            ইউনিভার্সিটি অব টলেডো
            <br />
            বাংলাদেশি কমিউনিটি
          </h1>
          <p className="mb-8 max-w-xl text-base text-[#A9BBD6] sm:text-lg">
            About four thousand miles from home. We cook together, we argue about cricket,
            and we pick you up from the airport.
          </p>

          {next ? (
            <div className="max-w-2xl rounded-xl border-2 border-dashed border-white/25 bg-white/[0.07] p-5">
              <p className="font-display text-sm font-bold text-genda">
                {new Date(next.starts_at).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p className="font-display text-xl text-white sm:text-2xl">{next.title}</p>
              <p className="mb-4 text-sm text-[#A9BBD6]">
                {[next.location_name, new Date(next.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })]
                  .filter(Boolean).join(' · ')}
              </p>
              <Link href={`/events/${next.slug}`} className="inline-flex min-h-[44px] items-center rounded-lg bg-genda px-4 py-2 text-sm font-semibold text-nil">
                See details
              </Link>
            </div>
          ) : (
            <Link href="/join" className="inline-flex min-h-[44px] items-center rounded-lg bg-genda px-5 py-2.5 text-sm font-semibold text-nil">
              Join UTBSA
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <p className="mb-1.5 font-display text-sm font-semibold text-kantha">New here</p>
            <h2 className="mb-2 font-display text-lg font-bold">Just landed in Toledo?</h2>
            <p className="text-sm text-ink-mid">
              Airport pickup, a place to sleep for a few nights, a mattress someone is leaving
              behind. Ask us before you pay for any of it.
            </p>
          </Card>
          <Card>
            <p className="mb-1.5 font-display text-sm font-semibold text-kantha">Membership</p>
            <h2 className="mb-2 font-display text-lg font-bold">$15 a semester</h2>
            <p className="text-sm text-ink-mid">
              Covers food at every event, and pays for the ones we run for free. Spouses and
              kids are included, not extra.
            </p>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-1">
            <p className="mb-1.5 font-display text-sm font-semibold text-kantha">Anyone</p>
            <h2 className="mb-2 font-display text-lg font-bold">You don&apos;t have to be Bangladeshi</h2>
            <p className="text-sm text-ink-mid">
              If you want to learn the language, eat the food, or dance badly at Boishakh,
              you are a member.
            </p>
          </Card>
        </div>

        <hr className="stitch my-12 border-0" />

        <div className="mb-5 flex flex-wrap items-baseline gap-4">
          <h2 className="font-display text-2xl font-bold">From the blog</h2>
          <Link href="/blog" className="text-sm font-semibold text-kantha">All posts</Link>
        </div>

        {posts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="block">
                <Card className="h-full transition-colors hover:border-kantha">
                  {p.category && <Pill tone="gold">{p.category}</Pill>}
                  <h3 className="mb-1.5 mt-2 font-display text-base font-bold leading-snug">{p.title}</h3>
                  <p className="text-sm text-ink-mid">{p.excerpt}</p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-mid">Nothing published yet.</p>
        )}

        <div className="mt-12"><Button href="/join">Join UTBSA</Button></div>
      </section>
    </>
  );
}
