# Leadmech n8n Workflows

These three files are importable workflow drafts for the production flow. The website verifies the paid order and calls the start-search n8n webhook; n8n then starts Apify, processes the result, stores files, and sends the completion email.

## Workflows

1. `01-nowpayments-confirmation.json` receives NOWPayments IPN callbacks and marks an order ready for search.
2. `02-start-apify-search.json` validates a paid order request and starts the Apify actor.
3. `03-complete-search-delivery.json` receives Apify completion, cleans up to 50,000 lead rows, creates CSV/XLSX, uploads files to Supabase Storage, marks the order completed, and sends the completion email.

## Import

Open n8n, go to Workflows, choose Import from File, and import all three JSON files. Keep them inactive until every credential is configured and a test run is successful.

## Production website endpoints

The Vercel app now exposes these production routes:

- NOWPayments IPN: `https://leadmech.vercel.app/api/webhooks/nowpayments`
- Apify completion webhook: `https://leadmech.vercel.app/api/webhooks/apify?secret=<APIFY_WEBHOOK_SECRET>`
- Start search from website: `https://leadmech.vercel.app/api/orders/:orderId/start`
- n8n start-search webhook: set the full production URL, including `?secret=...`, as `N8N_START_SEARCH_WEBHOOK_URL` in Vercel

Use the website start endpoint for the customer flow. It forwards the paid order to n8n using the private webhook URL secret.

## Required credentials

Do not paste secrets into workflow JSON fields. Create credentials inside n8n for:

- Supabase service role REST access
- Apify API bearer token
- Resend API bearer token
- NOWPayments IPN secret verification

If your n8n plan uses environment variables instead of custom credentials, set the same names shown in the workflow expressions in n8n's secure runtime environment, not in GitHub.

## Required values

- `SUPABASE_URL=https://vioosujcdwfcscwgtgsp.supabase.co`
- `APP_URL=https://leadmech.vercel.app`
- Supabase service role key
- Apify actor ID
- Apify API token
- NOWPayments IPN secret
- Resend API key
- Resend sender email

## Output

Package count means lead rows:

- Starter: 10,000 rows
- Growth: 25,000 rows
- Scale: 50,000 rows

The customer receives cleaned CSV/XLSX columns, not the raw actor column layout.
