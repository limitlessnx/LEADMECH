'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type OrderSummary = {
  id: string;
  orderCode: string;
  leadCount: number;
  packageName: string;
  deliveryEmail: string;
};

type SearchForm = {
  companyIndustries: string;
  companyCountries: string;
  companyCities: string;
  companySizes: string[];
  personCountries: string;
  personStates: string;
  jobTitles: string;
  seniority: string[];
  hasEmail: string;
  hasPhone: string;
  email: string;
  confirmEmail: string;
};

const initialForm: SearchForm = {
  companyIndustries: '',
  companyCountries: '',
  companyCities: '',
  companySizes: [],
  personCountries: '',
  personStates: '',
  jobTitles: '',
  seniority: [],
  hasEmail: 'verified',
  hasPhone: 'not-required',
  email: '',
  confirmEmail: '',
};

export function SearchBuilder({ order }: { order: OrderSummary }) {
  const [form, setForm] = useState<SearchForm>({ ...initialForm, email: order.deliveryEmail, confirmEmail: order.deliveryEmail });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const savedSearch = localStorage.getItem(`leadmech-search-${order.id}`) || localStorage.getItem('leadmech-search');
    if (savedSearch) setForm({ ...initialForm, email: order.deliveryEmail, confirmEmail: order.deliveryEmail, ...JSON.parse(savedSearch) });
  }, [order]);

  const emailsMatch = form.email.length > 0 && form.email === form.confirmEmail;
  const canReview = emailsMatch;
  const activeFilters = useMemo(() => {
    return [form.companyIndustries, form.companyCountries, form.companyCities, form.personCountries, form.personStates, form.jobTitles]
      .filter(Boolean).length + form.companySizes.length + form.seniority.length;
  }, [form]);

  const toggleArrayValue = (field: 'companySizes' | 'seniority', value: string) => {
    setForm((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  };

  const saveSearch = () => {
    setSubmitted(true);
    if (!canReview) return;
    localStorage.setItem(`leadmech-search-${order.id}`, JSON.stringify(form));
    localStorage.setItem('leadmech-search', JSON.stringify(form));
  };

  return (
    <>
      <div className="topbar">
        <div><span className="eyebrow">Search builder</span><h1>Build your lead search</h1><p className="muted">Every filter is optional. Delivery email confirmation is required.</p></div>
        <div className="locked-package"><span>Locked order {order.orderCode}</span><strong>{order.leadCount.toLocaleString('en-GB')} leads</strong></div>
      </div>
      <div className="builder-layout">
        <form className="card form-grid" onSubmit={(event) => event.preventDefault()}>
          <div className="form-section full"><span>Company filters</span></div>
          <div className="field full"><label>Company industries</label><input value={form.companyIndustries} onChange={(event) => setForm({ ...form, companyIndustries: event.target.value })} placeholder="Software, Real Estate, Financial Services" /><small>Separate multiple entries with commas.</small></div>
          <div className="field"><label>Company countries</label><input value={form.companyCountries} onChange={(event) => setForm({ ...form, companyCountries: event.target.value })} placeholder="United States" /></div>
          <div className="field"><label>Company cities</label><input value={form.companyCities} onChange={(event) => setForm({ ...form, companyCities: event.target.value })} placeholder="New York, Austin" /></div>
          <div className="field full"><label>Company sizes</label><div className="choice-row">{['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'].map((value) => <button type="button" onClick={() => toggleArrayValue('companySizes', value)} className={`choice ${form.companySizes.includes(value) ? 'selected' : ''}`} key={value}>{value}</button>)}</div></div>
          <div className="form-section full"><span>Person filters</span></div>
          <div className="field"><label>Person countries</label><input value={form.personCountries} onChange={(event) => setForm({ ...form, personCountries: event.target.value })} placeholder="United States" /></div>
          <div className="field"><label>Person states</label><input value={form.personStates} onChange={(event) => setForm({ ...form, personStates: event.target.value })} placeholder="California, Texas" /></div>
          <div className="field full"><label>Job titles</label><input value={form.jobTitles} onChange={(event) => setForm({ ...form, jobTitles: event.target.value })} placeholder="Founder, Sales Director, Project Manager" /></div>
          <div className="field full"><label>Seniority</label><div className="choice-row">{['Owner', 'Founder', 'C-Level', 'VP', 'Director', 'Head', 'Manager', 'Senior', 'Entry'].map((value) => <button type="button" onClick={() => toggleArrayValue('seniority', value)} className={`choice ${form.seniority.includes(value) ? 'selected' : ''}`} key={value}>{value}</button>)}</div></div>
          <div className="field"><label>Email requirement</label><select value={form.hasEmail} onChange={(event) => setForm({ ...form, hasEmail: event.target.value })}><option value="verified">Verified email required</option><option value="any">Any email status</option><option value="not-required">Email not required</option></select></div>
          <div className="field"><label>Phone requirement</label><select value={form.hasPhone} onChange={(event) => setForm({ ...form, hasPhone: event.target.value })}><option value="not-required">Phone not required</option><option value="required">Phone required</option></select></div>
          <div className="form-section full"><span>Delivery</span></div>
          <div className="field"><label>Delivery email *</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></div>
          <div className="field"><label>Confirm email *</label><input type="email" value={form.confirmEmail} onChange={(event) => setForm({ ...form, confirmEmail: event.target.value })} placeholder="you@company.com" />{submitted && !emailsMatch && <small className="error-text">The email addresses must match.</small>}</div>
          <div className="full form-actions"><Link className="btn btn-secondary" href="/dashboard">Save for later</Link>{canReview ? <Link onClick={saveSearch} className="btn btn-primary" href={`/review?order=${order.id}`}>Review search</Link> : <button type="button" onClick={saveSearch} className="btn btn-primary">Review search</button>}</div>
        </form>
        <aside className="card search-summary">
          <span className="pill">Live summary</span>
          <h2>{order.leadCount.toLocaleString('en-GB')} leads</h2>
          <div className="review-row"><span className="muted">Active filters</span><strong>{activeFilters}</strong></div>
          <div className="review-row"><span className="muted">Email requirement</span><strong>{form.hasEmail === 'verified' ? 'Verified' : form.hasEmail === 'any' ? 'Any status' : 'Optional'}</strong></div>
          <div className="review-row"><span className="muted">Phone requirement</span><strong>{form.hasPhone === 'required' ? 'Required' : 'Optional'}</strong></div>
          <p className="muted summary-note">Empty filters are omitted from the actor request.</p>
        </aside>
      </div>
    </>
  );
}
