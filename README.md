# Leadmech Website V1

Responsive Next.js prototype for Leadmech, built mobile-first and suitable for desktop.

## Included

- Landing page and pricing
- Customer login screen
- Package checkout summary
- Lead-search form
- Search review screen
- Customer dashboard
- Admin dashboard prototype
- Supabase schema and environment placeholders
- API placeholders for NOWPayments and Apify
- Clean lead-export utility designed for up to 50,000 lead rows

The n8n workflow is intentionally not included in this archive. It will be built after the website flow is approved.

## Packages

- $30: 10,000 leads
- $75: 25,000 leads
- $145: 50,000 leads

## Run locally on Windows

1. Extract this zip into a new folder separate from any existing website.
2. Open Command Prompt or PowerShell inside the extracted `leadmech-website` folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open `http://localhost:3000`.

Running these commands in this separate folder will not affect another deployed website.

## Environment variables

Copy `.env.example` to `.env.local`. Real credentials are not required to preview the UI.

Do not commit `.env.local` or API tokens to GitHub.

## Next stage

After the website is reviewed, connect:

1. Supabase authentication, database and storage
2. NOWPayments checkout and webhook
3. n8n orchestration
4. Apify actor execution
5. CSV and Excel generation
6. Resend transactional emails
