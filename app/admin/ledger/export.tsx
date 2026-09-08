'use client';

import type { LedgerEntry } from '@/lib/money';

export default function LedgerExport({ rows }: { rows: LedgerEntry[] }) {
  function download() {
    const header = 'date,direction,category,fund,amount,note';
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
      [r.occurred_on, r.direction, r.category, r.fund_name ?? '',
       (r.amount_cents / 100).toFixed(2), r.note ?? ''].map(esc).join(','));

    // BOM keeps Bengali text readable when Excel opens it.
    const blob = new Blob(['\uFEFF' + [header, ...lines].join('\n')],
      { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `utbsa-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button onClick={download}
      className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
      Export CSV
    </button>
  );
}
