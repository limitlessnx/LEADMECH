import { Suspense } from 'react';
import { Nav } from '@/components/Nav';
import { PackageCheckout } from '@/components/PackageCheckout';

export default function Checkout() {
  return <><Nav/><main className="container page-space"><Suspense fallback={<div className="card">Loading checkout…</div>}><PackageCheckout /></Suspense></main></>;
}
