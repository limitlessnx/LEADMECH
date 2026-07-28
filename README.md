# Leadmech

Leadmech is a mobile-first Next.js lead-search SaaS for selling fixed lead packages, taking crypto payments, handing paid searches to n8n, running an Apify actor, and delivering cleaned CSV/XLSX files through Supabase Storage and Resend email.

## Production stack

- Next.js on Vercel
- Supabase Auth, Postgres, and private Storage
- NOWPayments crypto checkout and IPN webhook
- n8n orchestration for paid search runs
- Apify actor runs through n8n
- Resend transactional emails
- Optional n8n workflow drafts in `/n8n`

## Packages

- Starter: $30 for 10,000 lead rows
- Growth: $75 for 25,000 lead rows
- Scale: $145 for 50,000 lead rows

## Main routes

- `/auth` - sign in or create account
- `/checkout?package=starter|growth|scale` - create a NOWPayments invoice
- `/search?order=<orderId>` - paid-order search builder
- `/review?order=<orderId>` - final review before Apify starts
- `/dashboard` - customer order and file history
- `/admin` - admin order view for profiles with `role = 'admin'`

## API routes

- `POST /api/payments/nowpayments/create`
- `POST /api/webhooks/nowpayments`
- `POST /api/orders/:id/start` - verifies the paid order, then sends it to the n8n start-search webhook
- `POST /api/webhooks/apify`
- `GET /api/orders/:id/download?format=csv|xlsx`

## Environment variables

Copy `.env.example` to `.env.local` for local development. Add the same keys in Vercel Production, Preview, and Development environments.

Never commit real API keys or service-role secrets.

Required before full production testing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`
- `APIFY_ACTOR_ID`
- `APIFY_API_TOKEN`
- `APIFY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `N8N_START_SEARCH_WEBHOOK_URL`
- `LEADMECH_WEBHOOK_SECRET`

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run build
npm audit
```

Both should pass before deployment.
