import { Suspense } from 'react';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function Auth() {
  return (
    <main className="container" style={{ maxWidth: 520, padding: '70px 0' }}>
      <Link className="brand" href="/"><span className="logo">L</span>Leadmech</Link>
      <Suspense fallback={<div className="card" style={{ marginTop: 28 }}>Loading...</div>}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
