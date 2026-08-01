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
  personCities: string;
  jobTitles: string;
  seniority: string[];
  hasEmail: string;
  hasPhone: string;
  email: string;
  confirmEmail: string;
};

const industrySuggestions = [
  'Software',
  'Information Technology & Services',
  'Financial Services',
  'Real Estate',
  'Construction',
  'Marketing & Advertising',
  'Healthcare',
  'Hospitality',
  'Retail',
  'Logistics & Supply Chain',
  'Education',
  'Manufacturing',
  'Agriculture',
  'Apparel & Fashion',
];

const countrySuggestions = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'United Arab Emirates',
  'South Africa',
  'Nigeria',
];

const stateSuggestions = [
  'California',
  'Texas',
  'Florida',
  'New York',
  'Illinois',
  'Maryland',
  'Georgia',
  'Washington',
  'Massachusetts',
  'New Jersey',
];

const citySuggestions = [
  'New York',
  'Los Angeles',
  'Austin',
  'San Francisco',
  'Chicago',
  'Miami',
  'Baltimore',
  'London',
  'Toronto',
  'Dubai',
  'Lagos',
];

const titleSuggestions = [
  'Founder',
  'Owner',
  'Chief Executive Officer',
  'Managing Director',
  'Sales Director',
  'Marketing Director',
  'Project Manager',
  'Operations Manager',
  'Business Development Manager',
  'Head of Sales',
  'Human Resources Manager',
  'Procurement Manager',
];

const companySizeOptions = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001-10000',
  '10001+',
];

const seniorityOptions = [
  'owner',
  'founder',
  'c_suite',
  'partner',
  'vp',
  'head',
  'director',
  'manager',
  'senior',
  'entry',
];

const seniorityLabels: Record<string, string> = {
  owner: 'Owner',
  founder: 'Founder',
  c_suite: 'C-Suite',
  partner: 'Partner',
  vp: 'Vice President',
  head: 'Head',
  director: 'Director',
  manager: 'Manager',
  senior: 'Senior',
  entry: 'Entry',
};

const initialForm: SearchForm = {
  companyIndustries: '',
  companyCountries: '',
  companyCities: '',
  companySizes: [],
  personCountries: '',
  personStates: '',
  personCities: '',
  jobTitles: '',
  seniority: [],
  hasEmail: 'verified',
  hasPhone: 'not-required',
  email: '',
  confirmEmail: '',
};

function appendSuggestion(current: string, value: string) {
  const entries = current
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!entries.some((item) => item.toLowerCase() === value.toLowerCase())) entries.push(value);
  return entries.join(', ');
}

export function SearchBuilder({ order }: { order: OrderSummary }) {
  const [form, setForm] = useState<SearchForm>({
    ...initialForm,
    email: order.deliveryEmail,
    confirmEmail: order.deliveryEmail,
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const savedSearch =
      localStorage.getItem(`leadmech-search-${order.id}`) ||
      localStorage.getItem('leadmech-search');
    if (savedSearch) {
      setForm({
        ...initialForm,
        email: order.deliveryEmail,
        confirmEmail: order.deliveryEmail,
        ...JSON.parse(savedSearch),
      });
    }
  }, [order]);

  const emailsMatch = form.email.length > 0 && form.email === form.confirmEmail;
  const canReview = emailsMatch;
  const activeFilters = useMemo(() => {
    return [
      form.companyIndustries,
      form.companyCountries,
      form.companyCities,
      form.personCountries,
      form.personStates,
      form.personCities,
      form.jobTitles,
    ].filter(Boolean).length + form.companySizes.length + form.seniority.length;
  }, [form]);

  const toggleArrayValue = (field: 'companySizes' | 'seniority', value: string) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const addSuggestion = (
    field:
      | 'companyIndustries'
      | 'companyCountries'
      | 'companyCities'
      | 'personCountries'
      | 'personStates'
      | 'personCities'
      | 'jobTitles',
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: appendSuggestion(current[field], value),
    }));
  };

  const saveSearch = () => {
    setSubmitted(true);
    if (!canReview) return;
    localStorage.setItem(`leadmech-search-${order.id}`, JSON.stringify(form));
    localStorage.setItem('leadmech-search', JSON.stringify(form));
  };

  const suggestionButtons = (
    field:
      | 'companyIndustries'
      | 'companyCountries'
      | 'companyCities'
      | 'personCountries'
      | 'personStates'
      | 'personCities'
      | 'jobTitles',
    values: string[],
  ) => (
    <div className="choice-row" style={{ marginTop: 10 }}>
      {values.slice(0, 8).map((value) => (
        <button
          type="button"
          className="choice"
          onClick={() => addSuggestion(field, value)}
          key={`${field}-${value}`}
        >
          + {value}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">Actor-guided search builder</span>
          <h1>Build your lead search</h1>
          <p className="muted">
            Suggestions map to filters supported by the connected Apify lead actor. Multiple values can be separated with commas.
          </p>
        </div>
        <div className="locked-package">
          <span>Locked order {order.orderCode}</span>
          <strong>{order.leadCount.toLocaleString('en-GB')} leads</strong>
        </div>
      </div>

      <div className="builder-layout">
        <form className="card form-grid" onSubmit={(event) => event.preventDefault()}>
          <div className="form-section full"><span>Company filters</span></div>

          <div className="field full">
            <label>Company industries</label>
            <input
              list="industry-options"
              value={form.companyIndustries}
              onChange={(event) => setForm({ ...form, companyIndustries: event.target.value })}
              placeholder="Software, Real Estate, Financial Services"
            />
            <datalist id="industry-options">
              {industrySuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            <small>Actor field: companyIndustryIncludes</small>
            {suggestionButtons('companyIndustries', industrySuggestions)}
          </div>

          <div className="field">
            <label>Company countries</label>
            <input
              list="company-country-options"
              value={form.companyCountries}
              onChange={(event) => setForm({ ...form, companyCountries: event.target.value })}
              placeholder="United States"
            />
            <datalist id="company-country-options">
              {countrySuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            {suggestionButtons('companyCountries', countrySuggestions)}
          </div>

          <div className="field">
            <label>Company cities</label>
            <input
              list="company-city-options"
              value={form.companyCities}
              onChange={(event) => setForm({ ...form, companyCities: event.target.value })}
              placeholder="New York, Austin"
            />
            <datalist id="company-city-options">
              {citySuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            {suggestionButtons('companyCities', citySuggestions)}
          </div>

          <div className="field full">
            <label>Company sizes</label>
            <div className="choice-row">
              {companySizeOptions.map((value) => (
                <button
                  type="button"
                  onClick={() => toggleArrayValue('companySizes', value)}
                  className={`choice ${form.companySizes.includes(value) ? 'selected' : ''}`}
                  key={value}
                >
                  {value}
                </button>
              ))}
            </div>
            <small>Actor field: companySizeIncludes</small>
          </div>

          <div className="form-section full"><span>Person filters</span></div>

          <div className="field">
            <label>Person countries</label>
            <input
              list="person-country-options"
              value={form.personCountries}
              onChange={(event) => setForm({ ...form, personCountries: event.target.value })}
              placeholder="United States"
            />
            <datalist id="person-country-options">
              {countrySuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            {suggestionButtons('personCountries', countrySuggestions)}
          </div>

          <div className="field">
            <label>Person states</label>
            <input
              list="person-state-options"
              value={form.personStates}
              onChange={(event) => setForm({ ...form, personStates: event.target.value })}
              placeholder="California, Texas"
            />
            <datalist id="person-state-options">
              {stateSuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            {suggestionButtons('personStates', stateSuggestions)}
          </div>

          <div className="field full">
            <label>Person cities</label>
            <input
              list="person-city-options"
              value={form.personCities}
              onChange={(event) => setForm({ ...form, personCities: event.target.value })}
              placeholder="Los Angeles, Baltimore"
            />
            <datalist id="person-city-options">
              {citySuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            <small>Actor field: personLocationCityIncludes</small>
            {suggestionButtons('personCities', citySuggestions)}
          </div>

          <div className="field full">
            <label>Job titles</label>
            <input
              list="title-options"
              value={form.jobTitles}
              onChange={(event) => setForm({ ...form, jobTitles: event.target.value })}
              placeholder="Founder, Sales Director, Project Manager"
            />
            <datalist id="title-options">
              {titleSuggestions.map((value) => <option value={value} key={value} />)}
            </datalist>
            <small>Actor field: personTitleIncludes</small>
            {suggestionButtons('jobTitles', titleSuggestions)}
          </div>

          <div className="field full">
            <label>Seniority</label>
            <div className="choice-row">
              {seniorityOptions.map((value) => (
                <button
                  type="button"
                  onClick={() => toggleArrayValue('seniority', value)}
                  className={`choice ${form.seniority.includes(value) ? 'selected' : ''}`}
                  key={value}
                >
                  {seniorityLabels[value]}
                </button>
              ))}
            </div>
            <small>Actor field: seniorityIncludes</small>
          </div>

          <div className="field">
            <label>Email requirement</label>
            <select
              value={form.hasEmail}
              onChange={(event) => setForm({ ...form, hasEmail: event.target.value })}
            >
              <option value="verified">Verified email required</option>
              <option value="any">Any available email</option>
              <option value="not-required">Email not required</option>
            </select>
          </div>

          <div className="field">
            <label>Phone requirement</label>
            <select
              value={form.hasPhone}
              onChange={(event) => setForm({ ...form, hasPhone: event.target.value })}
            >
              <option value="not-required">Phone not required</option>
              <option value="required">Phone required</option>
            </select>
          </div>

          <div className="form-section full"><span>Delivery</span></div>
          <div className="field">
            <label>Delivery email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@company.com"
            />
          </div>
          <div className="field">
            <label>Confirm email *</label>
            <input
              type="email"
              value={form.confirmEmail}
              onChange={(event) => setForm({ ...form, confirmEmail: event.target.value })}
              placeholder="you@company.com"
            />
            {submitted && !emailsMatch && (
              <small className="error-text">The email addresses must match.</small>
            )}
          </div>

          <div className="full form-actions">
            <Link className="btn btn-secondary" href="/dashboard">Save for later</Link>
            {canReview ? (
              <Link
                onClick={saveSearch}
                className="btn btn-primary"
                href={`/review?order=${order.id}`}
              >
                Review search
              </Link>
            ) : (
              <button type="button" onClick={saveSearch} className="btn btn-primary">
                Review search
              </button>
            )}
          </div>
        </form>

        <aside className="card search-summary">
          <span className="pill">Actor-ready summary</span>
          <h2>{order.leadCount.toLocaleString('en-GB')} leads</h2>
          <div className="review-row"><span className="muted">Active filters</span><strong>{activeFilters}</strong></div>
          <div className="review-row"><span className="muted">Email requirement</span><strong>{form.hasEmail === 'verified' ? 'Verified' : form.hasEmail === 'any' ? 'Any status' : 'Optional'}</strong></div>
          <div className="review-row"><span className="muted">Phone requirement</span><strong>{form.hasPhone === 'required' ? 'Required' : 'Optional'}</strong></div>
          <p className="muted summary-note">
            Only selected or entered filters are sent to the Apify actor. Empty filters are omitted.
          </p>
        </aside>
      </div>
    </>
  );
}
