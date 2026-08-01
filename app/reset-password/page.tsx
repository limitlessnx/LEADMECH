import Link from 'next/link';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <main className="container" style={{ maxWidth: 520, padding: '70px 0' }}>
      <Link className="brand" href="/"><span className="logo">L</span>Leadmech</Link>
      <ResetPasswordForm />
    </main>
  );
}
