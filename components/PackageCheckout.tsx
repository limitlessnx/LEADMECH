'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getPackage } from '@/lib/packages';
import { useState } from 'react';

export function PackageCheckout() {
  const params = useSearchParams();
  const selectedPackage = getPackage(params.get('package'));
  const [singleSearchAccepted, setSingleSearchAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const ready = singleSearchAccepted && termsAccepted;

  const continueToPayment = () => {
    localStorage.setItem('leadmech-package', JSON.stringify(selectedPackage));
  };

  return (
    <div className="checkout-layout">
      <section className="card checkout-card">
        <span className="eyebrow">Order summary</span>
        <h1>{selectedPackage.leads.toLocaleString('en-GB')} leads</h1>
        <p className="muted">One payment unlocks one lead search with a fixed lead quantity.</p>
        <div className="review-row"><span className="muted">Package</span><strong>{selectedPackage.name}</strong></div>
        <div className="review-row"><span className="muted">Price</span><strong>${selectedPackage.price}</strong></div>
        <div className="review-row"><span className="muted">Delivery</span><strong>CSV + Excel</strong></div>
        <div className="list feature-list">
          <span>✓ One customised lead search</span>
          <span>✓ Cleaned contact and company records</span>
          <span>✓ Permanent dashboard access</span>
          <span>✓ Completion email with download links</span>
        </div>
        <label className="check-line"><input type="checkbox" checked={singleSearchAccepted} onChange={(event) => setSingleSearchAccepted(event.target.checked)} /> <span>I understand this purchase includes one search only.</span></label>
        <label className="check-line"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /> <span>I agree to the Terms and Privacy Policy.</span></label>
        {ready ? (
          <Link onClick={continueToPayment} className="btn btn-primary btn-wide" href="/search">Continue to crypto payment</Link>
        ) : (
          <button className="btn btn-primary btn-wide" disabled>Accept both items to continue</button>
        )}
      </section>
      <aside className="card checkout-aside">
        <span className="pill">Secure checkout</span>
        <h2>What happens next?</h2>
        <ol className="numbered-list">
          <li><span>1</span><div><strong>Pay in crypto</strong><p className="muted">NOWPayments confirms the transaction.</p></div></li>
          <li><span>2</span><div><strong>Configure your search</strong><p className="muted">Choose any filters that matter to you.</p></div></li>
          <li><span>3</span><div><strong>Receive cleaned files</strong><p className="muted">CSV and Excel remain in your dashboard.</p></div></li>
        </ol>
      </aside>
    </div>
  );
}
