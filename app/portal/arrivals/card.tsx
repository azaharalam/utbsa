'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { claimArrival, releaseArrival, closeArrival } from '@/app/actions/community';
import { Card, Pill, Notice } from '@/components/ui';
import { Submit } from '@/components/money/forms';
import { useCloseOnSuccess } from '@/components/money/form-result';
import type { ArrivalSummary, ArrivalRequest } from '@/lib/queries/community';

export default function ArrivalCard({
  summary, detail,
}: {
  summary: ArrivalSummary; detail: ArrivalRequest | null;
}) {
  const [claimState, claim] = useFormState(claimArrival, {});
  const [relState, release] = useFormState(releaseArrival, {});
  const [closeState, close] = useFormState(closeArrival, {});
  const [closing, setClosing] = useState(false);

  useCloseOnSuccess(closeState?.ok, () => setClosing(false));

  const err = claimState?.error || relState?.error || closeState?.error;
  const needs = [
    summary.needs_pickup && 'lift from the airport',
    summary.needs_stay && 'somewhere to stay',
    summary.needs_shopping && 'first shop',
  ].filter(Boolean);

  const when = new Date(summary.arriving_on).toLocaleDateString('en-US',
    { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Card>
      {err && <Notice tone="error">{err}</Notice>}

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold">
            {detail ? detail.full_name : summary.first_name}
            {summary.people_count > 1 && (
              <span className="ml-2 font-normal text-ink-mid">
                and {summary.people_count - 1} other{summary.people_count > 2 ? 's' : ''}
              </span>
            )}
          </p>
          <p className="text-sm text-ink-mid">
            {when} · {summary.airport}
            {detail?.arriving_at && ` · ${detail.arriving_at.slice(0, 5)}`}
          </p>
          {summary.program && <p className="text-xs text-ink-mid">{summary.program}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {needs.map((n) => <Pill key={n as string} tone="green">{n as string}</Pill>)}
          </div>
        </div>

        {summary.status === 'open' ? (
          <form action={claim}>
            <input type="hidden" name="id" value={summary.id} />
            <Submit label="I'll meet them" />
          </form>
        ) : summary.mine ? (
          <Pill tone="gold">yours</Pill>
        ) : null}
      </div>

      {/* Flight and phone appear only once you have taken it on. */}
      {detail && (
        <div className="mt-4 border-t-2 border-dashed border-stitch pt-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {detail.flight_no && (
              <div><dt className="text-xs text-ink-mid">Flight</dt>
                <dd className="font-semibold">{detail.flight_no}</dd></div>
            )}
            <div><dt className="text-xs text-ink-mid">Email</dt>
              <dd><a href={`mailto:${detail.email}`} className="text-kantha hover:underline break-all">
                {detail.email}</a></dd></div>
            {detail.phone && (
              <div><dt className="text-xs text-ink-mid">Phone</dt>
                <dd><a href={`tel:${detail.phone}`} className="text-kantha">{detail.phone}</a></dd></div>
            )}
            {detail.luggage_note && (
              <div><dt className="text-xs text-ink-mid">Luggage</dt>
                <dd>{detail.luggage_note}</dd></div>
            )}
          </dl>
          {detail.note && <p className="mt-2 text-sm text-ink-mid">{detail.note}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setClosing(!closing)}
              className="min-h-[40px] rounded-lg bg-kantha px-3 text-sm font-semibold text-white">
              Mark as done
            </button>
            <form action={release}>
              <input type="hidden" name="id" value={summary.id} />
              <button type="submit"
                className="min-h-[40px] rounded-lg border-[1.5px] border-nil px-3 text-sm font-semibold text-nil">
                I can&apos;t after all
              </button>
            </form>
          </div>

          {closing && (
            <form action={close} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={summary.id} />
              <input name="note" placeholder="How it went — optional"
                className="flex-1 rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-sm" />
              <Submit label="Done" />
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
