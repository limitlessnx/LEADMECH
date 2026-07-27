import { Resend } from 'resend';
import { getSiteUrl, requireEnv } from '@/lib/site';

type PaymentEmail = {
  to: string;
  orderCode: string;
  packageName: string;
  leadCount: number;
  amount: number;
};

type CompletionEmail = {
  to: string;
  orderCode: string;
  deliveredCount: number;
};

function getMailer() {
  return new Resend(requireEnv('RESEND_API_KEY'));
}

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'Leadmech <orders@example.com>';
}

export async function sendPaymentConfirmationEmail(details: PaymentEmail) {
  const siteUrl = getSiteUrl();
  await getMailer().emails.send({
    from: fromEmail(),
    to: details.to,
    subject: `Leadmech payment confirmed - ${details.orderCode}`,
    html: `
      <h1>Payment confirmed</h1>
      <p>Your Leadmech order is ready for search setup.</p>
      <p><strong>Order:</strong> ${details.orderCode}</p>
      <p><strong>Package:</strong> ${details.packageName} - ${details.leadCount.toLocaleString('en-US')} leads</p>
      <p><strong>Amount:</strong> $${details.amount}</p>
      <p><a href="${siteUrl}/search">Complete your search</a></p>
    `,
  });
}

export async function sendCompletionEmail(details: CompletionEmail) {
  const siteUrl = getSiteUrl();
  await getMailer().emails.send({
    from: fromEmail(),
    to: details.to,
    subject: `Leadmech files ready - ${details.orderCode}`,
    html: `
      <h1>Your lead files are ready</h1>
      <p>Your search is complete with ${details.deliveredCount.toLocaleString('en-US')} cleaned lead rows.</p>
      <p><strong>Order:</strong> ${details.orderCode}</p>
      <p>Download your CSV and Excel files from your dashboard.</p>
      <p><a href="${siteUrl}/dashboard">Open dashboard</a></p>
    `,
  });
}
