'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/session';
import * as Members from '@/lib/queries/members';
import * as Content from '@/lib/queries/content';
import { sendMail, approvalEmail } from '@/lib/mail';
import { audit } from '@/lib/audit';
import type { MemberStatus } from '@/lib/types';

export type FormState = { error?: string; ok?: string };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
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

export async function setMemberRole(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const me = await requireAdmin();
    const id = String(fd.get('id'));
    const role = String(fd.get('role')) as 'member' | 'admin';
    await Members.setRole(me, id, role);
    await audit(me.id, 'member.role', 'member', id, { role });
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
    });

    await audit(me.id, 'event.save', 'event', id, { slug });
    revalidatePath('/admin/events');
    revalidatePath('/events');
    return { ok: 'Saved.' };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('events_slug_key')) return { error: 'Another event already uses that URL.' };
    return { error: msg };
  }
}
