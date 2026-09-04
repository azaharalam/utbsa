'use client';

import type { Member } from '@/lib/types';

const COLUMNS: (keyof Member)[] = [
  'full_name', 'email', 'phone', 'member_type', 'student_level',
  'department', 'hometown_bd', 'arrival_semester', 'arrival_year', 'status', 'role', 'created_at',
];

function escape(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExportButton({ members }: { members: Member[] }) {
  function download() {
    const rows = [COLUMNS.join(','), ...members.map((m) => COLUMNS.map((c) => escape(m[c])).join(','))];
    // BOM so Excel opens Bengali names correctly instead of mojibake.
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `utbsa-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button onClick={download} className="min-h-[44px] rounded-lg border-[1.5px] border-nil px-4 text-sm font-semibold text-nil">
      Export CSV
    </button>
  );
}
