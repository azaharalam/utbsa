'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile, updateVisibility } from '@/app/actions/profile';
import { Card, Field, Button, Toggle, Notice, Avatar } from '@/components/ui';
import { Confirmation } from '@/components/money/form-result';
import GraduateBox from '@/components/money/graduate';
import HouseholdBox from '@/components/money/household';
import type { HouseholdMember, HouseholdInvite } from '@/lib/queries/households';
import type { Member } from '@/lib/types';

function Save({ label = 'Save changes' }: { label?: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving…' : label}</Button>;
}

function PhotoUpload({ member }: { member: Member }) {
  const [url, setUrl] = useState(member.photo_url);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true); setErr(null);
    const body = new FormData();
    body.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body });
    const json = await res.json();

    if (!res.ok) { setErr(json?.error ?? 'Upload failed.'); setBusy(false); return; }
    setUrl(json.url);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mb-5 flex items-center gap-4">
      <Avatar name={member.full_name} url={url} size={72} />
      <div>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
          {busy ? 'Uploading…' : url ? 'Change photo' : 'Upload photo'}
          <input
            type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
          />
        </label>
        <p className="mt-1 text-xs text-ink-mid">JPEG, PNG, or WebP. Up to 3 MB.</p>
        {err && <p className="mt-1 text-xs text-alta">{err}</p>}
      </div>
    </div>
  );
}

export default function ProfileForm({
  member, household, incoming, outgoing, members,
}: {
  member: Member;
  household: HouseholdMember[];
  incoming: HouseholdInvite[];
  outgoing: HouseholdInvite[];
  members: { id: string; name: string }[];
}) {
  const [pState, pAction] = useFormState(updateProfile, {});
  const [vState, vAction] = useFormState(updateVisibility, {});

  return (
    <>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">My profile</h1>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card>
          {pState?.error && <Notice tone="error">{pState?.error}</Notice>}
          <Confirmation message={pState?.ok} />

          <PhotoUpload member={member} />

          <form action={pAction}>
            <Field label="Full name" name="full_name" defaultValue={member.full_name} required />
            {/*
              The personal address is where every sign-in link goes, so it is
              fixed here. Left editable, anyone who borrowed a signed-in phone
              could point it at themselves and hold the account for good.
            */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-ink-mid">
                Personal email
              </label>
              <div className="rounded-lg border border-[#D6D1C2] bg-muslin-deep px-3 py-2.5 text-sm text-ink-mid">
                {member.personal_email ?? '—'}
              </div>
              <p className="mt-1 text-xs text-ink-mid">
                Fixed — this is where we send your sign-in link. Ask an admin to change it.
              </p>
            </div>

            <Field label="UToledo email" name="university_email" type="email"
              defaultValue={member.university_email}
              hint="Signs you in as well. We do not send here — the university holds back mail from addresses it does not recognise." />
            <Field label="Phone" name="phone" type="tel" defaultValue={member.phone} />

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field
                label="Member type" name="member_type" as="select" defaultValue={member.member_type}
                options={[
                  { value: 'student', label: 'Student' },
                  { value: 'spouse', label: 'Spouse / family' },
                  { value: 'faculty', label: 'Faculty or staff' },
                  { value: 'alumni', label: 'Alum' },
                  { value: 'community', label: 'Toledo community' },
                ]}
              />
              <Field
                label="Level" name="student_level" as="select" defaultValue={member.student_level}
                options={[
                  { value: 'undergrad', label: 'Undergraduate' },
                  { value: 'masters', label: "Master's" },
                  { value: 'phd', label: 'PhD' },
                  { value: 'na', label: 'Not a student' },
                ]}
              />
              <Field label="Department" name="department" defaultValue={member.department} placeholder="Electrical Engineering" />
              <Field
                label="District in Bangladesh" name="hometown_bd" defaultValue={member.hometown_bd}
                placeholder="Sylhet" hint="Shown in the directory so people from home can find you."
              />
              <Field label="Arrived — semester" name="arrival_semester" as="select" defaultValue={member.arrival_semester}
                options={[{ value: 'spring', label: 'Spring' }, { value: 'summer', label: 'Summer' }, { value: 'fall', label: 'Fall' }]} />
              <Field label="Arrived — year" name="arrival_year" as="select"
                defaultValue={member.arrival_year ? String(member.arrival_year) : null}
                options={Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + 1 - i)).map((y) => ({ value: y, label: y }))} />
            </div>

            <Field label="LinkedIn" name="linkedin_url" defaultValue={member.linkedin_url} placeholder="Optional" />
            <Field label="A line about you" name="bio" as="textarea" rows={3} defaultValue={member.bio} placeholder="Optional" />

            <hr className="stitch my-5 border-0" />

            <h2 className="mb-1 font-display text-base font-bold">Emergency contact</h2>
            <p className="mb-3 text-sm text-ink-mid">
              Only the e-board can see this. Useful on picnic and road-trip days.
            </p>
            <Field label="Name" name="emergency_contact_name" defaultValue={member.emergency_contact_name} placeholder="Optional" />
            <Field label="Phone" name="emergency_contact_phone" type="tel" defaultValue={member.emergency_contact_phone} placeholder="Optional" />

            <Save />
          </form>
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-base font-bold">Who can see what</h2>
          <p className="mb-3 text-sm text-ink-mid">
            Nothing here is ever public. These control what other signed-in members see.
          </p>
          {vState?.error && <Notice tone="error">{vState?.error}</Notice>}
          <Confirmation message={vState?.ok} />

          <form action={vAction}>
            <Toggle label="Show my email" name="show_email" defaultChecked={member.show_email} />
            <Toggle label="Show my phone number" name="show_phone" defaultChecked={member.show_phone} />
            <Toggle label="Show my photo" name="show_photo" defaultChecked={member.show_photo} />
            <Toggle label="Show my department" name="show_department" defaultChecked={member.show_department} />
            <Toggle label="Show my district" name="show_hometown" defaultChecked={member.show_hometown} />
            <Toggle label="List me in the directory" name="in_directory" defaultChecked={member.in_directory} />
            <div className="mt-4"><Save label="Save privacy settings" /></div>
          </form>

          <HouseholdBox meId={member.id} household={household}
            incoming={incoming} outgoing={outgoing} members={members} />

          <GraduateBox memberType={member.member_type} />
        </Card>
      </div>
    </>
  );
}
