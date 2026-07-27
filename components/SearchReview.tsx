'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ReviewOrder = {
  id: string;
  orderCode: string;
  leadCount: number;
  packageName: string;
};

export function SearchReview({ order }: { order: ReviewOrder }) {
  const [search, setSearch] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedSearch = localStorage.getItem(`leadmech-search-${order.id}`) || localStorage.getItem('leadmech-search');
    if (savedSearch) setSearch(JSON.parse(savedSearch));
  }, [order]);

  const display = (value?: string | string[]) => Array.isArray(value) ? (value.length ? value.join(', ') : 'Any') : value || 'Any';

  const startSearch = async () => {
    setLoading(true);
    setError('');
    const response = await fetch(`/api/orders/${order.id}/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ search }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || 'Unable to start search.');
      return;
    }

    localStorage.removeItem(`leadmech-search-${order.id}`);
    window.location.href = '/dashboard';
  };

  return (
    <div className="review-layout">
      <section className="card">
        <span className="eyebrow">Final review</span>
        <h1>Confirm your search</h1>
        <p className="muted">You can still edit the filters now. Starting the search locks the order.</p>
        <div className="review-row"><span className="muted">Order</span><strong>{order.orderCode}</strong></div>
        <div className="review-row"><span className="muted">Package</span><strong>{order.packageName} - {order.leadCount.toLocaleString('en-GB')} leads</strong></div>
        <div className="review-row"><span className="muted">Company industries</span><strong>{display(search.companyIndustries)}</strong></div>
        <div className="review-row"><span className="muted">Company location</span><strong>{[display(search.companyCities), display(search.companyCountries)].filter((value) => value !== 'Any').join(', ') || 'Any'}</strong></div>
        <div className="review-row"><span className="muted">Company sizes</span><strong>{display(search.companySizes)}</strong></div>
        <div className="review-row"><span className="muted">Person location</span><strong>{[display(search.personStates), display(search.personCountries)].filter((value) => value !== 'Any').join(', ') || 'Any'}</strong></div>
        <div className="review-row"><span className="muted">Job titles</span><strong>{display(search.jobTitles)}</strong></div>
        <div className="review-row"><span className="muted">Seniority</span><strong>{display(search.seniority)}</strong></div>
        <div className="review-row"><span className="muted">Delivery email</span><strong>{display(search.email)}</strong></div>
        <div className="notice">Once started, the search cannot be edited, cancelled, or reused for another search.</div>
        {error && <p className="error-text">{error}</p>}
        <div className="form-actions"><Link className="btn btn-secondary" href={`/search?order=${order.id}`}>Edit search</Link><button onClick={startSearch} className="btn btn-primary" disabled={loading}>{loading ? 'Starting...' : 'Start search'}</button></div>
      </section>
      <aside className="card checkout-aside"><span className="pill">Order protection</span><h2>Your package stays fixed</h2><p className="muted">The actor receives the package lead count from the backend, not from an editable browser field.</p><div className="security-grid"><div><strong>1 search</strong><span>Per payment</span></div><div><strong>{order.leadCount.toLocaleString('en-GB')}</strong><span>Maximum rows</span></div><div><strong>2 files</strong><span>CSV and Excel</span></div></div></aside>
    </div>
  );
}
