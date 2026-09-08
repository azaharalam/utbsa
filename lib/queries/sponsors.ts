import 'server-only';
import { sql } from '@/lib/db';
import { audit, tracked } from '@/lib/audit';
import { can, hasAnyAdminAccess } from '@/lib/permissions';
import { tierFor, type Tier } from '@/lib/sponsors';
import type { Member } from '@/lib/types';

export type Sponsor = {
  id: string; name: string; type: string; website: string | null;
  blurb: string | null; total_cents: number; gift_count: number;
  first_gift: string; tier: Tier;
};

/**
 * Public sponsor list.
 *
 * Only donors who have explicitly agreed appear. In-kind gifts count toward
 * the tier — a restaurant that fed sixty people gave as much as one that
 * wrote a cheque.
 */
export async function publicSponsors(): Promise<Sponsor[]> {
  const rows = await sql<any[]>`
    select d.id,
           coalesce(d.public_name, d.name) as name,
           d.type, d.website, d.blurb,
           coalesce(sum(dn.amount_cents), 0)::int as total_cents,
           count(dn.id)::int as gift_count,
           min(dn.received_on)::text as first_gift
    from donors d
    join donations dn on dn.donor_id = d.id
    where d.show_publicly and not d.is_anonymous
    group by d.id, d.public_name, d.name, d.type, d.website, d.blurb
    having coalesce(sum(dn.amount_cents), 0) > 0
    order by sum(dn.amount_cents) desc, d.name
  `;
  return rows.map((r) => ({ ...r, tier: tierFor(r.total_cents) }));
}

/** Everyone who has given, with whether they are shown. Admin view. */
export async function allSponsors(actor: Member): Promise<(Sponsor & {
  show_publicly: boolean; is_anonymous: boolean; email: string | null;
  public_name: string | null;
})[]> {
  if (!(await can(actor.id, 'money'))) throw new Error('You do not have access to this.');
  const rows = await sql<any[]>`
    select d.id, d.name, d.public_name, d.type, d.website, d.blurb,
           d.show_publicly, d.is_anonymous, d.email,
           coalesce(sum(dn.amount_cents), 0)::int as total_cents,
           count(dn.id)::int as gift_count,
           min(dn.received_on)::text as first_gift
    from donors d
    left join donations dn on dn.donor_id = d.id
    group by d.id
    having coalesce(sum(dn.amount_cents), 0) > 0
    order by sum(dn.amount_cents) desc nulls last, d.name
  `;
  return rows.map((r) => ({ ...r, tier: tierFor(r.total_cents) }));
}

export async function updateSponsor(actor: Member, id: string, s: {
  showPublicly: boolean; publicName?: string | null;
  website?: string | null; blurb?: string | null;
}) {
  if (!(await can(actor.id, 'money'))) throw new Error('You do not have access to this.');
  if (s.website && !/^https?:\/\//.test(s.website)) {
    throw new Error('The website should start with https://');
  }
  await tracked(actor.id, 'donors', id,
    s.showPublicly ? 'sponsor.publish' : 'sponsor.unpublish', async () => {
      await sql`
        update donors set
          show_publicly = ${s.showPublicly},
          public_name = ${s.publicName ?? null},
          website = ${s.website ?? null},
          blurb = ${s.blurb ?? null}
        where id = ${id}
      `;
    });
}

/**
 * ─────────────────────────────────────────────────────────────
 * FINANCIAL SUMMARY — officers only.
 *
 * Any serving officer can read it, including a Media Officer with no money
 * permission, because the e-board collectively answers for the money. It is
 * NOT visible to ordinary members and never public.
 * ─────────────────────────────────────────────────────────────
 */
export async function financialSummary(actor: Member, termId?: string) {
  if (!(await hasAnyAdminAccess(actor.id))) {
    throw new Error('Only e-board members can see this.');
  }

  const rows = await sql<{ direction: string; category: string; total: string }[]>`
    select direction, category, sum(amount_cents)::text as total
    from ledger_entries
    where (${!termId} or term_id = ${termId ?? null})
    group by direction, category
    order by sum(amount_cents) desc
  `;

  const income = rows.filter((r) => r.direction === 'in')
    .map((r) => ({ category: r.category, cents: Number(r.total) }));
  const spending = rows.filter((r) => r.direction === 'out')
    .map((r) => ({ category: r.category, cents: Number(r.total) }));

  const totalIn = income.reduce((s, r) => s + r.cents, 0);
  const totalOut = spending.reduce((s, r) => s + r.cents, 0);

  const funds = await sql<{ name: string; is_restricted: boolean; balance: string }[]>`
    select f.name, f.is_restricted,
      (coalesce((select sum(amount_cents) from donations d
                 where d.fund_id = f.id and not d.is_in_kind), 0)
       - coalesce((select sum(amount_cents) from ledger_entries le
                   where le.fund_id = f.id and le.direction = 'out'), 0))::text as balance
    from funds f order by f.is_restricted, f.name
  `;

  const [outstanding] = await sql<{ owed: string; members: string }[]>`
    select coalesce(sum(bal), 0)::text as owed, count(*)::text as members from (
      select (coalesce((select sum(amount_cents) from dues_charges where member_id = m.id), 0)
            - coalesce((select sum(amount_cents) from payments    where member_id = m.id), 0)
            - coalesce((select sum(amount_cents) from adjustments where member_id = m.id), 0)) as bal
      from members m where m.status = 'active'
    ) x where bal > 0
  `;

  return {
    income, spending, totalIn, totalOut, net: totalIn - totalOut,
    funds: funds.map((f) => ({
      name: f.name, restricted: f.is_restricted, cents: Number(f.balance),
    })),
    outstanding_cents: Number(outstanding.owed),
    outstanding_members: Number(outstanding.members),
  };
}
