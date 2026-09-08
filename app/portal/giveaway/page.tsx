import { requireApproved } from '@/lib/session';
import { giveawayItems } from '@/lib/queries/community';
import GiveawayBoard from './board';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Giveaway' };

export default async function Giveaway() {
  const me = await requireApproved();
  const items = await giveawayItems(me);

  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">Giveaway</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-mid">
        People leaving Toledo list what they cannot take with them. People arriving
        furnish a flat for almost nothing. Everything here is free unless the poster
        says otherwise.
      </p>
      <GiveawayBoard items={items} meId={me.id} />
    </>
  );
}
