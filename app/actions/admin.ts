'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/session';
import * as Members from '@/lib/queries/members';
import * as Tokens from '@/lib/queries/tokens';
import { sql } from '@/lib/db';
import * as Content from '@/lib/queries/content';
import * as Potluck from '@/lib/queries/potluck';
import { sendMail, approvalEmail, magicLinkEmail } from '@/lib/mail';
import { audit } from '@/lib/audit';
import type { MemberStatus } from '@/lib/types';

export type FormState = { error?: string; ok?: string };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

/**
 * Send the confirmation link again.
 *
 * For somebody who signed up, never confirmed, and is therefore not in the
 * approval queue. Usually a mistyped address — in which case this will not
 * arrive either, and the answer is to correct the address first.
 */
export async function resendConfirmation(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  try {
    const id = String(fd.get('id'));
    const [m] = await sql<{ full_name: string; email: string }[]>`
      select full_name, email from members
      where id = ${id} and status = 'pending' and email_verified_at is null
    `;
    if (!m) return { error: 'That person has already confirmed, or no longer exists.' };

    const token = await Tokens.issueToken(m.email, 'signup');
    await sendMail({ to: m.email, ...magicLinkEmail(token, true) });
    await audit(me.id, 'member.resend_confirmation', 'member', id);

    revalidatePath('/admin/approvals');
    return { ok: `Sent again to ${m.email}.` };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function approveMember(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const id = String(fd.get('id'));
    const member = await Members.approve(me, id);
    if (!member) return { error: 'That member is no longer pending.' };

    await audit(me.id, 'member.approve', 'member', id);
    await sendMail({ to: member.email, ...approvalEmail(member.full_name.split(' ')[0]) });

    revalidatePath('/admin/approvals');
    revalidatePath('/admin/members');
    return { ok: 'Approved.' };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function rejectMember(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const id = String(fd.get('id'));
    const reason = String(fd.get('reason') ?? '').trim() || 'No reason given';
    await Members.reject(me, id, reason);
    await audit(me.id, 'member.reject', 'member', id, { reason });
    revalidatePath('/admin/approvals');
    return { ok: 'Rejected.' };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setMemberStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const id = String(fd.get('id'));
    const status = String(fd.get('status')) as MemberStatus;
    await Members.setStatus(me, id, status);
    await audit(me.id, 'member.status', 'member', id, { status });
    revalidatePath('/admin/members');
    return { ok: 'Updated.' };
  } catch (e) {
    return { error: (e as Error).message };
  }
}


export async function savePost(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const title = String(fd.get('title') ?? '').trim();
    const slug = slugify(String(fd.get('slug') ?? '') || title);
    if (!title || !slug) return { error: 'Title and URL are both required.' };

    const id = await Content.savePost(me, {
      id: String(fd.get('id') ?? '') || undefined,
      slug, title,
      excerpt: String(fd.get('excerpt') ?? '').trim() || null,
      body: String(fd.get('body') ?? ''),
      category: String(fd.get('category') ?? '').trim() || null,
      publish: fd.get('publish') === '1',
    });

    await audit(me.id, 'post.save', 'post', id, { slug });
    revalidatePath('/admin/posts');
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    return { ok: fd.get('publish') === '1' ? 'Published.' : 'Saved as draft.' };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('posts_slug_key')) return { error: 'Another post already uses that URL.' };
    return { error: msg };
  }
}

export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const title = String(fd.get('title') ?? '').trim();
    const slug = slugify(String(fd.get('slug') ?? '') || title);
    const startsRaw = String(fd.get('starts_at') ?? '');
    if (!title || !slug) return { error: 'Title and URL are both required.' };
    if (!startsRaw) return { error: 'A start date and time is required.' };

    const id = await Content.saveEvent(me, {
      id: String(fd.get('id') ?? '') || undefined,
      slug, title,
      bengali_title: String(fd.get('bengali_title') ?? '').trim() || null,
      description: String(fd.get('description') ?? '').trim() || null,
      starts_at: new Date(startsRaw),
      ends_at: fd.get('ends_at') ? new Date(String(fd.get('ends_at'))) : null,
      location_name: String(fd.get('location_name') ?? '').trim() || null,
      location_addr: String(fd.get('location_addr') ?? '').trim() || null,
      is_public: fd.get('is_public') === 'on',
      isPotluck: fd.get('is_potluck') === 'on',
      isTournament: fd.get('is_tournament') === 'on',
      playerRegClosesAt: fd.get('player_reg_closes_at')
        ? new Date(String(fd.get('player_reg_closes_at'))) : null,
      // Dollars in the form, cents in the database. Rounded so a stray
      // "15.005" cannot put a fraction of a cent into an integer column.
      playerContributionCents:
        Math.round(Number(fd.get('player_contribution') ?? 0) * 100) || 0,
      costBreakdown: String(fd.get('cost_breakdown') ?? '').trim() || null,
    });

    await audit(me.id, 'event.save', 'event', id, { slug });

    // The dish list was filled in on the same form. It can only be written
    // once the event exists, so it happens here rather than in saveEvent.
    // Blank rows are skipped — somebody adding a row and changing their mind
    // should not produce a nameless dish.
    let dishesAdded = 0;
    if (fd.get('is_potluck') === 'on') {
      const count = Number(fd.get('dish_count') ?? 0);
      for (let i = 0; i < count; i++) {
        const dish = String(fd.get(`dish_name_${i}`) ?? '').trim();
        if (!dish) continue;
        const ids = await Potluck.addItems(me, {
          eventId: id,
          category: String(fd.get(`dish_category_${i}`) ?? 'rice'),
          dish,
          covers: Number(fd.get(`dish_covers_${i}`) ?? 15),
          splitInto: Number(fd.get(`dish_split_${i}`) ?? 1),
        });
        dishesAdded += ids.length;
      }
    }

    revalidatePath('/admin/events');
    revalidatePath('/events');
    return {
      ok: dishesAdded
        ? `Saved, with ${dishesAdded} dish${dishesAdded === 1 ? '' : 'es'} on the list.`
        : 'Saved.',
    };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('events_slug_key')) return { error: 'Another event already uses that URL.' };
    return { error: msg };
  }
}
