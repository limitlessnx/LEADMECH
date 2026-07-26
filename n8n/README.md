# Leadmech n8n Workflows

Contains three importable workflows:

1. NOWPayments confirmation and payment email.
2. Start Apify search after review.
3. Receive Apify completion, clean up to 50,000 lead rows, create CSV/XLSX, upload to Supabase, update order, and send completion email.

## Import
Open n8n > Workflows > Import from File and import all three JSON files. Keep them inactive until credentials are configured.

## Required variables
See `.env.example`. Never commit real tokens to GitHub.

## Supabase
Run `supabase-required-fields.sql` and create a private bucket named `lead-files`.

## Website endpoint
POST to `/webhook/leadmech/start-search` with header `x-leadmech-secret`. The body must include orderId, email, confirmEmail, one valid package count, and any optional actor filters.

## Apify
Create an actor-run-succeeded webhook pointing to `/webhook/leadmech/apify-complete`. The real actor input/output mapping will be checked when the actor JSON is provided.

## Output
The package count is the number of rows: 10,000, 25,000, or 50,000. The exported files use a compact set of useful columns, not the raw actor column count.
