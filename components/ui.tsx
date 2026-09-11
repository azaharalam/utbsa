import Link from 'next/link';
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border-2 border-dashed border-stitch bg-white p-4 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children, href, type = 'button', variant = 'solid', className = '', disabled, full,
}: {
  children: ReactNode; href?: string; type?: 'button' | 'submit';
  variant?: 'solid' | 'ghost' | 'danger'; className?: string; disabled?: boolean; full?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 min-h-[44px]';
  const styles = {
    solid: 'bg-kantha text-white hover:bg-kantha/90',
    ghost: 'border-[1.5px] border-nil text-nil hover:bg-nil/5',
    danger: 'bg-alta text-white hover:bg-alta/90',
  }[variant];
  const cls = `${base} ${styles} ${full ? 'w-full' : ''} ${className}`;

  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} className={cls} disabled={disabled}>{children}</button>;
}

const pillTones: Record<string, string> = {
  green: 'bg-kantha-pale text-kantha',
  gold: 'bg-[#F8EACB] text-[#8A6410]',
  red: 'bg-[#F7DEDB] text-alta',
  grey: 'bg-muslin-deep text-ink-mid',
};

export function Pill({ tone = 'grey', children }: { tone?: keyof typeof pillTones | string; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${pillTones[tone] ?? pillTones.grey}`}>
      {children}
    </span>
  );
}

const avatarTones = ['bg-kantha text-white', 'bg-nil text-white', 'bg-genda text-nil', 'bg-alta text-white'];

export function Avatar({ name, url, size = 56 }: { name: string; url?: string | null; size?: number }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const tone = avatarTones[(name.charCodeAt(0) || 0) % avatarTones.length];

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {letters}
    </span>
  );
}

export function Field({
  label, name, type = 'text', defaultValue, placeholder, hint, required, as, options, rows = 4,
}: {
  label: string; name: string; type?: string; defaultValue?: string | null;
  placeholder?: string; hint?: string; required?: boolean;
  as?: 'textarea' | 'select'; options?: { value: string; label: string }[]; rows?: number;
}) {
  const cls =
    'w-full rounded-lg border border-[#D6D1C2] bg-white px-3 py-2.5 text-ink placeholder:text-[#A7A497] focus:border-kantha focus:outline-none focus:ring-2 focus:ring-kantha/25';
  return (
    <div className="mb-4">
      <label htmlFor={name} className="mb-1.5 block text-xs font-semibold text-ink-mid">
        {label}{required && <span className="text-alta"> *</span>}
      </label>
      {as === 'textarea' ? (
        <textarea id={name} name={name} rows={rows} defaultValue={defaultValue ?? ''} placeholder={placeholder} required={required} className={cls} />
      ) : as === 'select' ? (
        <select id={name} name={name} defaultValue={defaultValue ?? ''} className={cls}>
          <option value="">—</option>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} placeholder={placeholder} required={required} className={cls} />
      )}
      {hint && <p className="mt-1 text-xs text-ink-mid">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, name, defaultChecked, onChange }: {
  label: string; name: string; defaultChecked: boolean;
  /** Optional — for a toggle that reveals more of the form. */
  onChange?: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-muslin-deep py-3 last:border-b-0">
      <span className="text-sm">{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only"
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined} />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#C9C4B4] transition-colors peer-checked:bg-kantha peer-focus-visible:ring-2 peer-focus-visible:ring-genda">
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-stitch bg-white/60 px-6 py-12 text-center">
      <h3 className="mb-1 font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mb-4 max-w-sm text-sm text-ink-mid">{body}</p>
      {action}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'bg-kantha-pale border-kantha text-ink',
    error: 'bg-[#F7DEDB] border-alta text-ink',
    success: 'bg-kantha-pale border-kantha text-ink',
  }[tone];
  return <div className={`mb-4 rounded-lg border-2 border-dashed px-4 py-3 text-sm ${tones}`}>{children}</div>;
}
