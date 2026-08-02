import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GlobalActionLoader } from '@/components/GlobalActionLoader';

export const metadata: Metadata = {
  title: 'Leadmech — Leads on demand',
  description: 'Buy a lead package, configure your search, and receive cleaned CSV and Excel files.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}><GlobalActionLoader /></Suspense>
        {children}
      </body>
    </html>
  );
}
