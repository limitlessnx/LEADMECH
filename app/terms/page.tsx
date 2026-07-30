import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Terms of Service | Leadmech',
  description: 'Terms governing access to and use of Leadmech lead-search services.',
};

const updated = '30 July 2026';

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="container legal-page">
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: {updated}</p>

        <section className="legal-card">
          <p>
            These Terms of Service govern your access to and use of Leadmech, including our website,
            customer dashboard, lead-search tools, downloadable files, payment services, and related
            support. By creating an account, purchasing a package, or using Leadmech, you agree to these Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>1. Eligibility and accounts</h2>
          <p>You must provide accurate account and billing information and keep your login details secure. You are responsible for activity performed through your account.</p>
          <p>You may not create accounts using false identities, impersonate another person or organisation, share access with unauthorised users, or attempt to bypass package, payment, security, or usage controls.</p>
        </section>

        <section className="legal-section">
          <h2>2. Lead packages and delivery</h2>
          <p>Each purchase provides one lead-search allocation for the lead quantity stated at checkout. Search criteria, available fields, match rates, and final delivered quantities may depend on the selected filters and available source data.</p>
          <p>Leadmech does not guarantee that every record will contain every field, that every contact detail will remain valid indefinitely, or that use of any lead will result in a response, sale, appointment, or other commercial outcome.</p>
        </section>

        <section className="legal-section legal-warning">
          <h2>3. Responsible and lawful use of leads</h2>
          <p><strong>Leadmech does not condone the misuse of leads obtained through our service.</strong> You may use delivered data only for legitimate, lawful business purposes and in compliance with all privacy, data-protection, consumer-protection, telemarketing, electronic-communications, anti-spam, and marketing laws that apply to you and the people you contact.</p>
          <p>You are responsible for identifying a valid legal basis for your outreach, providing required notices, honouring opt-out and suppression requests, maintaining do-not-contact lists, and obtaining consent where required.</p>
          <p>Prohibited uses include:</p>
          <ul>
            <li>Harassment, threats, discrimination, stalking, intimidation, or repeated unwanted contact.</li>
            <li>Spam, deceptive messages, misleading subject lines, spoofing, phishing, malware, or fraudulent offers.</li>
            <li>Identity theft, impersonation, scams, account takeover, or any unlawful financial activity.</li>
            <li>Publishing sensitive personal information, doxxing, surveillance, or profiling people for harmful purposes.</li>
            <li>Reselling, redistributing, sublicensing, or publicly posting lead files unless Leadmech gives written permission.</li>
            <li>Using data to make unlawful decisions about employment, housing, credit, insurance, healthcare, or other protected opportunities.</li>
            <li>Attempting to re-identify, enrich, combine, or process data in a way that violates applicable law or a person’s rights.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Suspension and termination</h2>
          <p>We may investigate suspected misuse and may restrict, suspend, or permanently disable an account without prior notice where we reasonably believe the service is being used for irregular, abusive, fraudulent, unlawful, deceptive, or security-threatening activity.</p>
          <p>We may also suspend access for chargebacks, payment fraud, attempts to evade limits, interference with our systems, breach of these Terms, repeated complaints, or conduct that creates legal, reputational, or operational risk for Leadmech or its service providers.</p>
          <p>Where appropriate, we may preserve relevant records, block future registrations, cancel pending searches, and cooperate with payment providers, hosting providers, regulators, or law-enforcement authorities.</p>
        </section>

        <section className="legal-section">
          <h2>5. Payments and refunds</h2>
          <p>Prices are shown before checkout. Cryptocurrency payments may be processed by third-party payment providers and can involve network fees, exchange-rate changes, and confirmation delays outside our control.</p>
          <p>Because each search uses paid third-party infrastructure and is configured for the purchaser, completed or processing searches are generally non-refundable. We may provide a replacement search, account credit, or refund where a verified technical failure caused by Leadmech prevents delivery. Duplicate payments and failed deliveries should be reported promptly.</p>
        </section>

        <section className="legal-section">
          <h2>6. Data quality and customer verification</h2>
          <p>Lead data may be sourced, matched, cleaned, or enriched through third-party systems. Public and business information changes over time. You must independently verify that a record is suitable and lawful for your intended use before contacting, importing, or acting on it.</p>
        </section>

        <section className="legal-section">
          <h2>7. Intellectual property</h2>
          <p>Leadmech and its website, software, branding, interfaces, workflows, and documentation are owned by or licensed to us. These Terms grant you a limited, non-exclusive, non-transferable right to use the service for its intended purpose. They do not transfer ownership of Leadmech technology or branding.</p>
        </section>

        <section className="legal-section">
          <h2>8. Third-party services</h2>
          <p>Leadmech relies on third-party hosting, authentication, database, payment, automation, data-processing, and email-delivery providers. Their availability and processing may be governed by separate terms. We are not responsible for interruptions or failures outside our reasonable control.</p>
        </section>

        <section className="legal-section">
          <h2>9. Disclaimers and limitation of liability</h2>
          <p>The service is provided on an “as available” basis. To the maximum extent permitted by law, Leadmech disclaims implied warranties of uninterrupted availability, fitness for a particular purpose, accuracy, merchantability, and non-infringement.</p>
          <p>Leadmech is not responsible for your outreach campaigns, messages, legal basis, recipient complaints, platform restrictions, lost profits, missed opportunities, or indirect or consequential losses. Our aggregate liability relating to a claim will not exceed the amount you paid Leadmech for the affected order, except where applicable law does not permit that limitation.</p>
        </section>

        <section className="legal-section">
          <h2>10. Changes to these Terms</h2>
          <p>We may update these Terms to reflect service, legal, security, or operational changes. The updated date will appear at the top of this page. Continued use after an update means you accept the revised Terms.</p>
        </section>

        <section className="legal-section">
          <h2>11. Contact</h2>
          <p>Questions, complaints, misuse reports, and account enquiries may be sent to <a className="legal-link" href="mailto:support@leadmech.xyz">support@leadmech.xyz</a>.</p>
        </section>

        <div className="legal-actions">
          <Link className="btn btn-secondary" href="/privacy">Read Privacy Policy</Link>
          <Link className="btn btn-primary" href="/">Return home</Link>
        </div>
      </main>
      <footer className="footer"><div className="container footer-inner"><span>© 2026 Leadmech.</span><div><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href="mailto:support@leadmech.xyz">support@leadmech.xyz</a></div></div></footer>
    </>
  );
}
