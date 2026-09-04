import type { Metadata } from 'next';
import { Baloo_Da_2, Noto_Sans } from 'next/font/google';
import './globals.css';

const display = Baloo_Da_2({
  subsets: ['latin', 'bengali'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const body = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'UTBSA — Bangladeshi Students Association', template: '%s · UTBSA' },
  description:
    'The Bangladeshi student and family community at the University of Toledo. Cultural events, new student support, and a place to land when you arrive.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
