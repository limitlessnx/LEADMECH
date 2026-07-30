import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Privacy Policy | Leadmech',
  description: 'How Leadmech collects, uses, stores, and protects personal information.',
};

const updated = '30 July 2026';

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="container legal-page">
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: {updated}</p>

        <section className="legal-card">
          <p>This Privacy Policy explains how Leadmech collects, uses, stores, and shares personal information when you visit our website, create an account, purchase a lead package, run a search, download files, or contact support.</p>
        </section>

        <section className="legal-section">
          <h2>1. Information we collect</h2>
          <p>Depending on how you use Leadmech, we may collect:</p>
          <ul>
            <li><strong>Account information:</strong> email address, user ID, account role, authentication records, and account creation dates.</li>
            <li><strong>Order information:</strong> selected package, order identifiers, payment status, delivery email, timestamps, and transaction references.</li>
            <li><strong>Search information:</strong> industries, job titles, seniority, company size, location, contact requirements, and other filters you submit.</li>
            <li><strong>Service records:</strong> workflow status, processing logs, actor run IDs, dataset IDs, file paths, delivery status, and error information.</li>
            <li><strong>Technical information:</strong> IP address, device and browser information, request logs, cookies, security events, and usage information generated when you access the service.</li>
            <li><strong>Support communications:</strong> messages and information you provide when contacting us.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How we use information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Create and secure accounts and authenticate users.</li>
            <li>Process orders and confirm payments.</li>
            <li>Run requested lead searches and prepare CSV and Excel files.</li>
            <li>Deliver files, emails, receipts, service notices, and customer support.</li>
            <li>Maintain dashboards, order histories, and download access.</li>
            <li>Prevent fraud, misuse, abuse, unauthorised access, and violations of our Terms.</li>
            <li>Diagnose errors, monitor performance, improve the service, and comply with legal obligations.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Legal grounds for processing</h2>
          <p>Where applicable law requires a legal basis, we process information to perform our contract with you, comply with legal obligations, protect legitimate interests such as platform security and fraud prevention, and act on consent where consent is required.</p>
          <p>Leadmech customers are independently responsible for determining the lawful basis and communication rules that apply when they use delivered lead data for outreach.</p>
        </section>

        <section className="legal-section">
          <h2>4. Service providers and sharing</h2>
          <p>We may share necessary information with providers that help us operate Leadmech, including:</p>
          <ul>
            <li>Vercel for website hosting and application delivery.</li>
            <li>Supabase for authentication, database services, and private file storage.</li>
            <li>NOWPayments for cryptocurrency checkout and payment confirmation.</li>
            <li>Apify for automated data searches and processing.</li>
            <li>n8n for workflow automation.</li>
            <li>Resend for transactional email delivery.</li>
          </ul>
          <p>We may also disclose information when required by law, to investigate fraud or abuse, to protect rights and safety, or as part of a merger, financing, acquisition, or sale of business assets. We do not sell customer account information as a standalone product.</p>
        </section>

        <section className="legal-section">
          <h2>5. Lead data</h2>
          <p>Lead files may contain business and professional contact information produced from search criteria submitted by a customer. Customers must use this information lawfully, respect objections and opt-outs, and avoid harassment, deception, spam, discrimination, or other prohibited uses.</p>
          <p>If you believe your information appears in a Leadmech-delivered file and you wish to report misuse or request assistance, contact <a className="legal-link" href="mailto:support@leadmech.xyz">support@leadmech.xyz</a>. We may request information needed to verify and investigate the request.</p>
        </section>

        <section className="legal-section">
          <h2>6. Data retention</h2>
          <p>We retain account, order, payment, workflow, and support records for as long as reasonably necessary to provide the service, maintain transaction histories, prevent abuse, resolve disputes, enforce agreements, and comply with legal requirements.</p>
          <p>Completed lead files may remain available in a customer dashboard until they are deleted under our retention practices, account closure procedures, security requirements, or storage policies. Backup copies may remain for a limited period before deletion.</p>
        </section>

        <section className="legal-section">
          <h2>7. Security</h2>
          <p>We use technical and organisational safeguards intended to protect information, including authenticated access, row-level database controls, private storage, encrypted connections, restricted service credentials, and monitoring. No internet service can guarantee absolute security, so users should protect their login credentials and report suspicious activity promptly.</p>
        </section>

        <section className="legal-section">
          <h2>8. International processing</h2>
          <p>Our providers may process information in countries other than your own. Where required, we use provider agreements and other safeguards intended to protect information during international processing.</p>
        </section>

        <section className="legal-section">
          <h2>9. Your choices and rights</h2>
          <p>Depending on your location, you may have rights to request access, correction, deletion, restriction, objection, portability, or withdrawal of consent. You may also have the right to complain to a data-protection authority.</p>
          <p>Requests may be sent to <a className="legal-link" href="mailto:support@leadmech.xyz">support@leadmech.xyz</a>. We may need to verify your identity and may retain information where required for security, payment, fraud-prevention, or legal purposes.</p>
        </section>

        <section className="legal-section">
          <h2>10. Cookies and similar technologies</h2>
          <p>Leadmech may use cookies or similar technologies required for authentication, security, preferences, and core website operation. Where optional analytics or advertising technologies are introduced, we will provide notices or controls where required by law.</p>
        </section>

        <section className="legal-section">
          <h2>11. Children</h2>
          <p>Leadmech is a business service and is not intended for children. We do not knowingly permit children to create customer accounts or purchase lead packages.</p>
        </section>

        <section className="legal-section">
          <h2>12. Policy changes</h2>
          <p>We may update this Privacy Policy to reflect changes in our service, providers, security practices, or legal obligations. The revised date will appear at the top of this page.</p>
        </section>

        <section className="legal-section">
          <h2>13. Contact</h2>
          <p>Privacy questions, rights requests, complaints, and misuse reports may be sent to <a className="legal-link" href="mailto:support@leadmech.xyz">support@leadmech.xyz</a>.</p>
        </section>

        <div className="legal-actions">
          <Link className="btn btn-secondary" href="/terms">Read Terms of Service</Link>
          <Link className="btn btn-primary" href="/">Return home</Link>
        </div>
      </main>
      <footer className="footer"><div className="container footer-inner"><span>© 2026 Leadmech.</span><div><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href="mailto:support@leadmech.xyz">support@leadmech.xyz</a></div></div></footer>
    </>
  );
}
