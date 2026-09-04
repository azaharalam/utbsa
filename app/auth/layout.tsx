import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-baseline gap-2 font-display text-2xl font-extrabold text-nil">
        UTBSA <span className="text-sm font-semibold text-kantha">ইউটিবিএসএ</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
