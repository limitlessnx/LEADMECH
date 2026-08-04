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
  companyStates: string;
  companyCities: string;
  companySizes: string[];
  personCountries: string;
  personStates: string;
  personCities: string;
  jobTitles: string;
  seniority: string[];
  emailStatus: 'verified' | 'unverified' | 'any';
  hasEmail: 'required' | 'not-required';
  hasPhone: 'required' | 'not-required';
  totalResults: number;
  email: string;
  confirmEmail: string;
};

type SearchableSelectProps = {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  multiple?: boolean;
  allowCustom?: boolean;
  disabled?: boolean;
  helper?: string;
};

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon',
  'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cyprus',
  'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'Estonia',
  'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Guatemala', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait',
  'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Malaysia', 'Malta', 'Mexico',
  'Moldova', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Panama', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Puerto Rico', 'Qatar', 'Romania', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea',
  'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan', 'Tanzania', 'Thailand',
  'Tunisia', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Zambia', 'Zimbabwe',
];

const STATE_OPTIONS: Record<string, string[]> = {
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina',
    'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  Canada: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan'],
  'United Kingdom': ['England', 'Northern Ireland', 'Scotland', 'Wales'],
  Australia: ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
  Nigeria: ['Abia', 'Abuja Federal Capital Territory', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'],
  'United Arab Emirates': ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'],
  India: ['Andhra Pradesh', 'Delhi', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal'],
  Brazil: ['Bahia', 'Ceara', 'Distrito Federal', 'Minas Gerais', 'Parana', 'Pernambuco', 'Rio de Janeiro', 'Rio Grande do Sul', 'Santa Catarina', 'Sao Paulo'],
  Germany: ['Baden-Wurttemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saxony', 'Schleswig-Holstein'],
  France: ['Auvergne-Rhone-Alpes', 'Brittany', 'Grand Est', 'Hauts-de-France', 'Ile-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Cote d Azur'],
  'South Africa': ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'],
};

const CITY_OPTIONS: Record<string, string[]> = {
  'United States': ['Atlanta', 'Austin', 'Baltimore', 'Boston', 'Charlotte', 'Chicago', 'Dallas', 'Denver', 'Houston', 'Las Vegas', 'Los Angeles', 'Miami', 'New York City', 'Orlando', 'Philadelphia', 'Phoenix', 'San Diego', 'San Francisco', 'Seattle', 'Washington'],
  Canada: ['Calgary', 'Edmonton', 'Hamilton', 'Montreal', 'Ottawa', 'Toronto', 'Vancouver', 'Winnipeg'],
  'United Kingdom': ['Birmingham', 'Bristol', 'Edinburgh', 'Glasgow', 'Leeds', 'Liverpool', 'London', 'Manchester'],
  Australia: ['Adelaide', 'Brisbane', 'Canberra', 'Melbourne', 'Perth', 'Sydney'],
  Nigeria: ['Abuja', 'Benin City', 'Ibadan', 'Kano', 'Lagos', 'Port Harcourt'],
  'United Arab Emirates': ['Abu Dhabi', 'Ajman', 'Dubai', 'Sharjah'],
  India: ['Ahmedabad', 'Bangalore', 'Chennai', 'Delhi', 'Gurgaon', 'Hyderabad', 'Kolkata', 'Mumbai', 'Noida', 'Pune'],
  Germany: ['Berlin', 'Cologne', 'Dusseldorf', 'Frankfurt', 'Hamburg', 'Munich', 'Stuttgart'],
  France: ['Bordeaux', 'Lille', 'Lyon', 'Marseille', 'Nice', 'Paris', 'Toulouse'],
  Brazil: ['Belo Horizonte', 'Brasilia', 'Curitiba', 'Fortaleza', 'Porto Alegre', 'Recife', 'Rio de Janeiro', 'Salvador', 'Sao Paulo'],
  'South Africa': ['Cape Town', 'Durban', 'Johannesburg', 'Port Elizabeth', 'Pretoria'],
};

const INDUSTRIES = [
  'Accounting', 'Agriculture', 'Airlines/Aviation', 'Apparel & Fashion', 'Architecture & Planning',
  'Automotive', 'Banking', 'Biotechnology', 'Business Supplies & Equipment', 'Civil Engineering',
  'Computer & Network Security', 'Computer Hardware', 'Computer Software', 'Construction',
  'Consumer Goods', 'Consumer Services', 'Education Management', 'Electrical/Electronic Manufacturing',
  'Entertainment', 'Environmental Services', 'Events Services', 'Financial Services', 'Food & Beverages',
  'Government Administration', 'Healthcare', 'Hospital & Health Care', 'Hospitality',
  'Human Resources', 'Import & Export', 'Information Services', 'Information Technology & Services',
  'Insurance', 'Internet', 'Legal Services', 'Logistics & Supply Chain', 'Machinery',
  'Management Consulting', 'Manufacturing', 'Marketing & Advertising', 'Media Production',
  'Medical Devices', 'Mining & Metals', 'Nonprofit Organization Management', 'Oil & Energy',
  'Pharmaceuticals', 'Professional Training & Coaching', 'Program Development', 'Public Relations & Communications',
  'Real Estate', 'Renewables & Environment', 'Research', 'Restaurants', 'Retail', 'SaaS',
  'Staffing & Recruiting', 'Telecommunications', 'Transportation/Trucking/Railroad', 'Travel & Tourism',
  'Venture Capital & Private Equity', 'Wholesale',
];

const JOB_TITLES = [
  'Account Manager', 'Business Development Manager', 'Chief Executive Officer', 'Chief Financial Officer',
  'Chief Marketing Officer', 'Chief Operating Officer', 'Chief Technology Officer', 'Commercial Director',
  'Director of Marketing', 'Director of Operations', 'Director of Sales', 'Founder', 'Head of Business Development',
  'Head of Marketing', 'Head of Sales', 'Human Resources Manager', 'Managing Director', 'Marketing Manager',
  'Operations Manager', 'Owner', 'Procurement Manager', 'Project Manager', 'Sales Director', 'Sales Manager',
  'Vice President of Marketing', 'Vice President of Sales',
];

const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'];
const SENIORITY_OPTIONS = ['c_suite', 'vp', 'director', 'manager', 'senior', 'entry', 'owner', 'partner'];
const SENIORITY_LABELS: Record<string, string> = {
  c_suite: 'C-Suite', vp: 'Vice President', director: 'Director', manager: 'Manager',
  senior: 'Senior', entry: 'Entry', owner: 'Owner', partner: 'Partner',
};

function splitValues(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function SearchableSelect({ label, options, values, onChange, placeholder, multiple = false, allowCustom = false, disabled = false, helper }: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = options.filter((option) => option.toLowerCase().includes(query.toLowerCase())).filter((option) => !values.includes(option)).slice(0, 60);

  const selectValue = (value: string) => {
    if (!value.trim()) return;
    onChange(multiple ? [...values, value.trim()] : [value.trim()]);
    setQuery('');
    if (!multiple) setOpen(false);
  };

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label>{label}</label>
      {values.length > 0 && <div className="choice-row" style={{ marginBottom: 8 }}>{values.map((value) => <button type="button" className="choice selected" key={`${label}-${value}`} onClick={() => onChange(values.filter((item) => item !== value))} title="Remove">{value} ×</button>)}</div>}
      <input value={query} disabled={disabled} placeholder={disabled ? 'Select a country first' : placeholder} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === 'Enter' && allowCustom && query.trim()) { event.preventDefault(); selectValue(query); } }} autoComplete="off" />
      {open && !disabled && <div className="search-select-menu" onMouseDown={(event) => event.preventDefault()}>
        {filtered.map((option) => <button type="button" key={`${label}-option-${option}`} onClick={() => selectValue(option)}>{option}</button>)}
        {allowCustom && query.trim() && !options.some((option) => option.toLowerCase() === query.trim().toLowerCase()) && <button type="button" onClick={() => selectValue(query)}>Add “{query.trim()}”</button>}
        {!filtered.length && !(allowCustom && query.trim()) && <div className="muted" style={{ padding: 14 }}>No matching options.</div>}
      </div>}
      {helper && <small>{helper}</small>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className={`contact-toggle ${checked ? 'selected' : ''}`}><span>{label}</span><span className="toggle-track"><span /></span></button>;
}

export function SearchBuilder({ order }: { order: OrderSummary }) {
  const maxResults = Math.min(order.leadCount, 50000);
  const initialForm: SearchForm = {
    companyIndustries: '', companyCountries: '', companyStates: '', companyCities: '', companySizes: [],
    personCountries: '', personStates: '', personCities: '', jobTitles: '', seniority: [],
    emailStatus: 'verified', hasEmail: 'required', hasPhone: 'not-required', totalResults: maxResults,
    email: order.deliveryEmail, confirmEmail: order.deliveryEmail,
  };
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const savedSearch = localStorage.getItem(`leadmech-search-${order.id}`) || localStorage.getItem('leadmech-search');
    if (!savedSearch) return;
    try {
      const saved = JSON.parse(savedSearch);
      setForm({ ...initialForm, ...saved, companyStates: saved.companyStates || '', emailStatus: saved.emailStatus || (saved.hasEmail === 'verified' ? 'verified' : 'any'), hasEmail: saved.hasEmail === 'not-required' ? 'not-required' : 'required', hasPhone: saved.hasPhone === 'required' ? 'required' : 'not-required', totalResults: Math.min(Number(saved.totalResults || maxResults), maxResults), email: order.deliveryEmail, confirmEmail: order.deliveryEmail });
    } catch { setForm(initialForm); }
  }, [order.id, order.deliveryEmail, maxResults]);

  const personCountry = splitValues(form.personCountries)[0] || '';
  const companyCountry = splitValues(form.companyCountries)[0] || '';
  const personStateOptions = STATE_OPTIONS[personCountry] || [];
  const companyStateOptions = STATE_OPTIONS[companyCountry] || [];
  const personCityOptions = CITY_OPTIONS[personCountry] || [];
  const companyCityOptions = CITY_OPTIONS[companyCountry] || [];
  const emailsMatch = form.email.length > 0 && form.email === form.confirmEmail;
  const personCityHasState = !form.personCities || Boolean(form.personStates);
  const companyCityHasState = !form.companyCities || Boolean(form.companyStates);
  const cityFallbackReady = personCityHasState && companyCityHasState;
  const canReview = emailsMatch && cityFallbackReady && form.totalResults > 0 && form.totalResults <= maxResults;
  const activeFilters = useMemo(() => [form.companyIndustries, form.companyCountries, form.companyStates, form.companyCities, form.personCountries, form.personStates, form.personCities, form.jobTitles].filter(Boolean).length + form.companySizes.length + form.seniority.length, [form]);

  const setStringValues = (field: keyof SearchForm, values: string[]) => setForm((current) => ({ ...current, [field]: values.join(', ') }));
  const toggleArrayValue = (field: 'companySizes' | 'seniority', value: string) => setForm((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  const saveSearch = () => { setSubmitted(true); if (!canReview) return; localStorage.setItem(`leadmech-search-${order.id}`, JSON.stringify(form)); localStorage.setItem('leadmech-search', JSON.stringify(form)); };

  return <>
    <div className="topbar"><div><span className="eyebrow">Apify actor search</span><h1>Build your lead search</h1><p className="muted">Choose broad targeting filters. Cities are treated as preferences and automatically expand to the selected state when more leads are needed.</p></div><div className="locked-package"><span>Locked order {order.orderCode}</span><strong>{order.leadCount.toLocaleString('en-GB')} leads</strong></div></div>
    <div className="builder-layout">
      <form className="card form-grid" onSubmit={(event) => event.preventDefault()}>
        <div className="form-section full"><span>Person location</span></div>
        <SearchableSelect label="Person country" options={COUNTRIES} values={splitValues(form.personCountries)} onChange={(values) => { setStringValues('personCountries', values.slice(-1)); setForm((current) => ({ ...current, personStates: '', personCities: '' })); }} placeholder="Search countries..." helper="Actor field: personLocationCountryIncludes" />
        <SearchableSelect label="Person state" options={personStateOptions} values={splitValues(form.personStates)} onChange={(values) => setStringValues('personStates', values.slice(-1))} placeholder="Search states..." allowCustom disabled={!personCountry} helper="Required when a person city preference is selected" />
        <div className="full"><SearchableSelect label="Person city preference (optional)" options={personCityOptions} values={splitValues(form.personCities)} onChange={(values) => setStringValues('personCities', values)} placeholder="Search or type a preferred city..." multiple allowCustom disabled={!personCountry} helper="We search this city first, then expand to the selected state to help fill the purchased lead amount." /></div>
        {submitted && !personCityHasState && <small className="error-text full">Select a person state when using a person city preference.</small>}

        <div className="form-section full"><span>Company location and profile</span></div>
        <SearchableSelect label="Company country" options={COUNTRIES} values={splitValues(form.companyCountries)} onChange={(values) => { setStringValues('companyCountries', values.slice(-1)); setForm((current) => ({ ...current, companyStates: '', companyCities: '' })); }} placeholder="Search countries..." helper="Actor field: companyLocationCountryIncludes" />
        <SearchableSelect label="Company state" options={companyStateOptions} values={splitValues(form.companyStates)} onChange={(values) => setStringValues('companyStates', values.slice(-1))} placeholder="Search states..." allowCustom disabled={!companyCountry} helper="Required when a company city preference is selected" />
        <div className="full"><SearchableSelect label="Company city preference (optional)" options={companyCityOptions} values={splitValues(form.companyCities)} onChange={(values) => setStringValues('companyCities', values)} placeholder="Search or type a preferred city..." multiple allowCustom disabled={!companyCountry} helper="We search this city first, then expand to the selected state to help fill the purchased lead amount." /></div>
        {submitted && !companyCityHasState && <small className="error-text full">Select a company state when using a company city preference.</small>}
        <div className="full"><SearchableSelect label="Company industry" options={INDUSTRIES} values={splitValues(form.companyIndustries)} onChange={(values) => setStringValues('companyIndustries', values)} placeholder="Search industries..." multiple helper="Searchable multi-select mapped to companyIndustryIncludes" /></div>
        <div className="field full"><label>Company size</label><div className="choice-row">{COMPANY_SIZE_OPTIONS.map((value) => <button type="button" key={value} onClick={() => toggleArrayValue('companySizes', value)} className={`choice ${form.companySizes.includes(value) ? 'selected' : ''}`}>{value}</button>)}</div><small>Actor field: companySizeIncludes</small></div>

        <div className="form-section full"><span>Role and contact data</span></div>
        <div className="full"><SearchableSelect label="Job title" options={JOB_TITLES} values={splitValues(form.jobTitles)} onChange={(values) => setStringValues('jobTitles', values)} placeholder="Search or type a job title..." multiple allowCustom helper="Suggestions plus custom values, mapped to personTitleIncludes" /></div>
        <div className="field full"><label>Seniority</label><div className="choice-row">{SENIORITY_OPTIONS.map((value) => <button type="button" key={value} onClick={() => toggleArrayValue('seniority', value)} className={`choice ${form.seniority.includes(value) ? 'selected' : ''}`}>{SENIORITY_LABELS[value]}</button>)}</div><small>Uses the actor’s supported seniority values.</small></div>
        <div className="field"><label>Email status</label><select value={form.emailStatus} disabled={form.hasEmail === 'not-required'} onChange={(event) => setForm({ ...form, emailStatus: event.target.value as SearchForm['emailStatus'] })}><option value="verified">Verified only</option><option value="unverified">Unverified only</option><option value="any">Any email status</option></select></div>
        <div className="field"><label>Contact requirements</label><div style={{ display: 'grid', gap: 10 }}><Toggle label="Has email" checked={form.hasEmail === 'required'} onChange={(checked) => setForm({ ...form, hasEmail: checked ? 'required' : 'not-required' })} /><Toggle label="Has phone" checked={form.hasPhone === 'required'} onChange={(checked) => setForm({ ...form, hasPhone: checked ? 'required' : 'not-required' })} /></div></div>

        <div className="form-section full"><span>Result quantity</span></div>
        <div className="field full"><label>Total results</label><input type="number" min={1} max={maxResults} value={form.totalResults} onChange={(event) => setForm({ ...form, totalResults: Math.min(Math.max(Number(event.target.value) || 1, 1), maxResults) })} /><input type="range" min={1} max={maxResults} step={Math.max(1, Math.round(maxResults / 100))} value={form.totalResults} onChange={(event) => setForm({ ...form, totalResults: Number(event.target.value) })} /><small>Maximum for this purchase: {maxResults.toLocaleString('en-GB')} leads. Actor maximum per run: 50,000.</small></div>

        <div className="form-section full"><span>Delivery</span></div>
        <div className="field"><label>Delivery email *</label><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
        <div className="field"><label>Confirm email *</label><input type="email" value={form.confirmEmail} onChange={(event) => setForm({ ...form, confirmEmail: event.target.value })} />{submitted && !emailsMatch && <small className="error-text">The email addresses must match.</small>}</div>

        <div className="full form-actions"><Link className="btn btn-secondary" href="/dashboard">Save for later</Link>{canReview ? <Link onClick={saveSearch} className="btn btn-primary" href={`/review?order=${order.id}`}>Review search</Link> : <button type="button" onClick={saveSearch} className="btn btn-primary">Review search</button>}</div>
        <div className="full search-warning" role="note"><strong>Important:</strong> The stricter your search, the lower the chance of reaching your desired target amount. Leadmech will safely broaden optional filters when necessary.</div>
      </form>

      <aside className="card search-summary"><span className="pill">Actor-ready summary</span><h2>{form.totalResults.toLocaleString('en-GB')} leads</h2><div className="review-row"><span className="muted">Active filters</span><strong>{activeFilters}</strong></div><div className="review-row"><span className="muted">Email</span><strong>{form.hasEmail === 'required' ? form.emailStatus : 'Optional'}</strong></div><div className="review-row"><span className="muted">Phone</span><strong>{form.hasPhone === 'required' ? 'Required' : 'Optional'}</strong></div><p className="muted summary-note">Cities are preferences. Leadmech searches them first, then expands to the selected state and other optional filters when needed.</p></aside>
    </div>
  </>;
}
