'use client';

import { useSearchParams } from 'next/navigation';
import { getPackage } from '@/lib/packages';
import { useState } from 'react';

export function PackageCheckout() {
  const params = useSearchParams();
  const selectedPackage = getPackage(params.get('package'));
  const [singleSearchAccepted, setSingleSearchAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const ready = singleSearchAccepted && termsAccepted;

  const continueToPayment = async () => {
    setError('');
    setLoading(true);
    localStorage.setItem('leadmech-package', JSON.stringify(selectedPackage));

    const response = await fetch('/api/payments/nowpayments/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ packageId: selectedPackage.id }),
    });
    const data = await response.json();
    setLoading(false);

    if (response.status === 401) {
      window.location.href = `/auth?next=${encodeURIComponent(`/checkout?package=${selectedPackage.id}`)}`;
      return;
    }

    if (!response.ok) {
      setError(data.error || 'Unable to start checkout.');
      return;
    }

    window.location.href = data.invoiceUrl;
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
          <span>OK One customised lead search</span>
          <span>OK Cleaned contact and company records</span>
          <span>OK Permanent dashboard access</span>
          <span>OK Completion email with download links</span>
        </div>
        <label className="check-line"><input type="checkbox" checked={singleSearchAccepted} onChange={(event) => setSingleSearchAccepted(event.target.checked)} /> <span>I understand this purchase includes one search only.</span></label>
        <label className="check-line"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /> <span>I agree to the Terms and Privacy Policy.</span></label>
        {error && <p className="error-text">{error}</p>}
        {ready ? (
          <button onClick={continueToPayment} className="btn btn-primary btn-wide" disabled={loading}>{loading ? 'Creating checkout...' : 'Continue to crypto payment'}</button>
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
