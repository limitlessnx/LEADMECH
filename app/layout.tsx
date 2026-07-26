import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leadmech — Leads on demand',
  description: 'Buy a lead package, configure your search, and receive cleaned CSV and Excel files.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
