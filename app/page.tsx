import Link from 'next/link';
import { Nav } from '@/components/Nav';

const packages = [
  {
    id: 'starter',
    name: 'Starter',
    leads: '10,000',
    price: '$30',
    fit: 'Best for testing a focused outreach campaign.',
  },
  {
    id: 'growth',
    name: 'Growth',
    leads: '25,000',
    price: '$75',
    fit: 'Best for agencies and repeat prospecting.',
  },
  {
    id: 'scale',
    name: 'Scale',
    leads: '50,000',
    price: '$145',
    fit: 'Best for high-volume sales pipelines.',
  },
];

const leadColumns = ['Full Name', 'Job Title', 'Email', 'Phone', 'LinkedIn', 'Company', 'Industry', 'Location'];

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <section className="container hero">
          <div>
            <span className="eyebrow">Verified B2B lead files on demand</span>
            <h1>Buy quality leads with verified email filters and clean delivery.</h1>
            <p>Choose a package, pay securely with crypto, build your search, and receive structured CSV and Excel files prepared for outreach.</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#pricing">Buy leads now</a>
              <a className="btn btn-secondary" href="#quality">See lead quality</a>
            </div>
            <div className="trust-strip" aria-label="Leadmech quality signals">
              <span>Verified email filters</span>
              <span>CSV + Excel included</span>
              <span>Dashboard downloads</span>
              <span>Crypto checkout</span>
            </div>
          </div>
          <div className="mock">
            <div className="mock-top"><strong>Lead file preview</strong><span className="pill">Verified</span></div>
            <div className="metric-grid">
              <div className="metric"><span className="muted">Rows</span><strong>25k</strong></div>
              <div className="metric"><span className="muted">Format</span><strong>CSV</strong></div>
              <div className="metric"><span className="muted">Emails</span><strong>Verified</strong></div>
            </div>
            <div className="lead-table" aria-label="Example cleaned lead columns">
              <div className="lead-table-head">
                <span>Name</span>
                <span>Role</span>
                <span>Email</span>
              </div>
              <div className="lead-table-row">
                <span>Sarah M.</span>
                <span>Marketing Manager</span>
                <span>verified</span>
              </div>
              <div className="lead-table-row">
                <span>David K.</span>
                <span>Sales Director</span>
                <span>verified</span>
              </div>
              <div className="lead-table-row">
                <span>Amanda R.</span>
                <span>Operations Lead</span>
                <span>verified</span>
              </div>
            </div>
          </div>
        </section>

        <section id="quality" className="container quality-section">
          <div>
            <h2 className="section-title">Built to deliver usable lead lists, not raw data dumps.</h2>
            <p className="muted">Leadmech turns broad search filters into cleaned contact files with the fields buyers actually need for prospecting, enrichment, and outreach.</p>
          </div>
          <div className="quality-grid">
            <div className="quality-item"><strong>Verified-first email filtering</strong><span>Searches can require verified emails and exclude unverified records.</span></div>
            <div className="quality-item"><strong>Structured files</strong><span>CSV and Excel outputs use clean columns instead of messy scraper exports.</span></div>
            <div className="quality-item"><strong>Permanent access</strong><span>Completed orders remain available from the customer dashboard.</span></div>
            <div className="quality-item"><strong>Locked lead count</strong><span>The selected package controls the search size from the backend.</span></div>
          </div>
        </section>

        <section className="container deliverables">
          <div className="deliverable-copy">
            <span className="eyebrow">What your file includes</span>
            <h2 className="section-title">Clean columns your team can use immediately.</h2>
            <p className="muted">Each delivery is prepared around contact, company, and targeting details so buyers can move straight into sales tools or spreadsheets.</p>
          </div>
          <div className="column-cloud">
            {leadColumns.map((column) => <span key={column}>{column}</span>)}
          </div>
        </section>

        <section id="how" className="container">
          <h2 className="section-title">A clear paid search workflow.</h2>
          <p className="muted">Customers always know what happens before and after payment.</p>
          <div className="process-grid">
            <div className="process-step"><span>01</span><strong>Choose package</strong><p className="muted">Select 10,000, 25,000, or 50,000 lead rows.</p></div>
            <div className="process-step"><span>02</span><strong>Pay with crypto</strong><p className="muted">NOWPayments confirms the transaction before search access opens.</p></div>
            <div className="process-step"><span>03</span><strong>Build search</strong><p className="muted">Use any combination of industry, title, company, and location filters.</p></div>
            <div className="process-step"><span>04</span><strong>Receive files</strong><p className="muted">Download CSV and Excel from the dashboard and receive the completion email.</p></div>
          </div>
        </section>

        <section className="container dashboard-preview">
          <div className="dashboard-card">
            <div className="mock-top"><strong>Customer dashboard</strong><span className="pill">Completed</span></div>
            <div className="dashboard-list">
              <div className="dashboard-row"><span>LM-1028</span><strong>25,000 leads</strong><span className="status completed">Completed</span><span>CSV</span><span>Excel</span></div>
              <div className="dashboard-row"><span>LM-1029</span><strong>10,000 leads</strong><span className="status processing">Processing</span><span>-</span><span>-</span></div>
              <div className="dashboard-row"><span>LM-1030</span><strong>50,000 leads</strong><span className="status completed">Completed</span><span>CSV</span><span>Excel</span></div>
            </div>
          </div>
          <div>
            <span className="eyebrow">Buyer confidence</span>
            <h2 className="section-title">Every order has a visible status and saved files.</h2>
            <p className="muted">The dashboard makes Leadmech feel like a real lead platform: buyers can track searches, return to completed files, and see exactly what they paid for.</p>
          </div>
        </section>

        <section id="pricing" className="container">
          <h2 className="section-title">Fixed pricing, locked lead volume.</h2>
          <p className="muted">One checkout equals one package and one search. The selected lead count is locked by the backend after payment.</p>
          <div className="pricing-grid" style={{ marginTop: 24 }}>
            {packages.map((p, i) => (
              <div key={p.id} className={`card pricing-card ${i === 1 ? 'featured' : ''}`}>
                <span className="pill">{p.name}</span>
                <div className="price">{p.price}</div>
                <h3>{p.leads} leads</h3>
                <p className="muted">{p.fit}</p>
                <div className="list">
                  <span>Verified email filters included</span>
                  <span>Cleaned CSV and Excel files</span>
                  <span>Email delivery through Resend</span>
                  <span>Saved to customer dashboard</span>
                </div>
                <Link className="btn btn-primary" href={`/checkout?package=${p.id}`} style={{ width: '100%' }}>Buy package</Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="footer"><div className="container">Copyright 2026 Leadmech. Verified lead search with clean CSV and Excel delivery.</div></footer>
    </>
  );
}
