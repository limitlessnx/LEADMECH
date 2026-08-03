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
  csvUrl?: string;
  xlsxUrl?: string;
};

function getMailer() {
  return new Resend(requireEnv('RESEND_API_KEY'));
}

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'Leadmech <info@leadmech.xyz>';
}

export async function sendPaymentConfirmationEmail(details: PaymentEmail) {
  const siteUrl = getSiteUrl();
  const result = await getMailer().emails.send({
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

  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function sendCompletionEmail(details: CompletionEmail) {
  const siteUrl = getSiteUrl();
  const downloadLinks = [
    details.xlsxUrl ? `<p><a href="${details.xlsxUrl}" style="display:inline-block;padding:12px 18px;background:#48e2a8;color:#062218;text-decoration:none;border-radius:10px;font-weight:700">Download Excel file</a></p>` : '',
    details.csvUrl ? `<p><a href="${details.csvUrl}" style="display:inline-block;padding:12px 18px;background:#6ea8ff;color:#061426;text-decoration:none;border-radius:10px;font-weight:700">Download CSV file</a></p>` : '',
  ].join('');

  const result = await getMailer().emails.send({
    from: fromEmail(),
    to: details.to,
    subject: `Leadmech files ready - ${details.orderCode}`,
    html: `
      <h1>Your lead files are ready</h1>
      <p>Your search is complete with ${details.deliveredCount.toLocaleString('en-US')} cleaned lead rows.</p>
      <p><strong>Order:</strong> ${details.orderCode}</p>
      ${downloadLinks}
      <p>The direct download links expire after seven days. Your files remain available from your Leadmech dashboard.</p>
      <p><a href="${siteUrl}/dashboard">Open dashboard</a></p>
    `,
  });

  if (result.error) throw new Error(result.error.message);
  return result.data;
}
