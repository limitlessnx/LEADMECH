'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPackage, LeadPackage } from '@/lib/packages';

export function SearchReview() {
  const [selectedPackage, setSelectedPackage] = useState<LeadPackage>(getPackage());
  const [search, setSearch] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    const savedPackage = localStorage.getItem('leadmech-package');
    const savedSearch = localStorage.getItem('leadmech-search');
    if (savedPackage) setSelectedPackage(JSON.parse(savedPackage));
    if (savedSearch) setSearch(JSON.parse(savedSearch));
  }, []);

  const display = (value?: string | string[]) => Array.isArray(value) ? (value.length ? value.join(', ') : 'Any') : value || 'Any';
  const startSearch = () => {
    localStorage.setItem('leadmech-order-status', 'Queued');
    localStorage.setItem('leadmech-order-created', new Date().toISOString());
  };

  return (
    <div className="review-layout">
      <section className="card">
        <span className="eyebrow">Final review</span>
        <h1>Confirm your search</h1>
        <p className="muted">You can still edit the filters now. Starting the search locks the order.</p>
        <div className="review-row"><span className="muted">Package</span><strong>{selectedPackage.leads.toLocaleString('en-GB')} leads</strong></div>
        <div className="review-row"><span className="muted">Company industries</span><strong>{display(search.companyIndustries)}</strong></div>
        <div className="review-row"><span className="muted">Company location</span><strong>{[display(search.companyCities), display(search.companyCountries)].filter((value) => value !== 'Any').join(', ') || 'Any'}</strong></div>
        <div className="review-row"><span className="muted">Company sizes</span><strong>{display(search.companySizes)}</strong></div>
        <div className="review-row"><span className="muted">Person location</span><strong>{[display(search.personStates), display(search.personCountries)].filter((value) => value !== 'Any').join(', ') || 'Any'}</strong></div>
        <div className="review-row"><span className="muted">Job titles</span><strong>{display(search.jobTitles)}</strong></div>
        <div className="review-row"><span className="muted">Seniority</span><strong>{display(search.seniority)}</strong></div>
        <div className="review-row"><span className="muted">Delivery email</span><strong>{display(search.email)}</strong></div>
        <div className="notice">Once started, the search cannot be edited, cancelled, or reused for another search.</div>
        <div className="form-actions"><Link className="btn btn-secondary" href="/search">Edit search</Link><Link onClick={startSearch} className="btn btn-primary" href="/dashboard">Start search</Link></div>
      </section>
      <aside className="card checkout-aside"><span className="pill">Order protection</span><h2>Your package stays fixed</h2><p className="muted">The actor receives the package lead count from the backend, not from an editable browser field.</p><div className="security-grid"><div><strong>1 search</strong><span>Per payment</span></div><div><strong>{selectedPackage.leads.toLocaleString('en-GB')}</strong><span>Maximum rows</span></div><div><strong>2 files</strong><span>CSV and Excel</span></div></div></aside>
    </div>
  );
}
