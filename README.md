# Leadmech

Responsive Next.js lead-generation platform with crypto checkout, Supabase-ready storage, Apify integration placeholders, and importable n8n workflows.

## Included

- Mobile-first website suitable for desktop
- Three fixed lead packages
- Checkout, search builder, review page, dashboard, and admin prototype
- Supabase schema and environment placeholders
- NOWPayments and Apify API placeholders
- n8n payment, search-start, and completion workflows
- CSV and Excel delivery for up to 50,000 lead rows

## Packages

- $30: 10,000 leads
- $75: 25,000 leads
- $145: 50,000 leads

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local` or real API keys.

The n8n-specific setup files are inside `/n8n`.

## Next integrations

1. Supabase authentication, database, and private file storage
2. NOWPayments checkout and signed payment webhook
3. n8n deployment and credentials
4. Real Apify actor input/output mapping
5. Resend transactional emails
6. GitHub-to-Vercel deployment
