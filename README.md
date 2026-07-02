# STL Hockey Sticks — stlhockeysticks.com

Next.js 15 storefront. Wholesale hockey sticks, monthly batch pre-orders, local St. Louis pickup, Clover payments.

## Stack

| Piece | Choice |
|---|---|
| App / hosting | Next.js 15 (App Router) on **Vercel** |
| Database | Postgres on **Railway** ($5/mo plan) via Prisma |
| Payments | **Clover Hosted Checkout** (redirect; PCI handled by Clover) |
| Auth | **Clerk**, optional — guest checkout always works. No Clerk keys = auth silently disabled |
| Cart | Client-side (localStorage), server re-prices from DB at checkout |

## Local dev

```bash
npm install
cp .env.example .env   # fill in values
npm run db:push        # create tables on Railway Postgres
npm run db:seed        # products + open batch
npm run dev
```

## Deploy checklist

1. **Railway**: create Postgres, copy `DATABASE_URL` connection string.
2. **Clover**: Setup → API Tokens → create token with online payment/checkout permission. Grab Merchant ID. Sandbox first (`CLOVER_API_BASE=https://apisandbox.dev.clover.com`), switch to `https://api.clover.com` for production.
3. **Vercel**: import GitHub repo, add all env vars from `.env.example`, deploy. Point `stlhockeysticks.com` DNS at Vercel.
4. Run `npm run db:push && npm run db:seed` once against the Railway DB (locally with prod `DATABASE_URL`).
5. **Clover webhook**: dashboard → Webhooks → `https://stlhockeysticks.com/api/webhooks/clover`. First ping logs a verification code — check Vercel function logs, paste code back into Clover.
6. Optional **Clerk**: add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` env vars. Accounts page lights up automatically.

## How the monthly batch works

- `Batch` row with `status: OPEN` collects pre-orders.
- Cutoff (1st of month): mark it `ORDERED`, place the Alibaba order, create next OPEN batch.
- Shipment lands: mark `ARRIVED`, set orders `READY_FOR_PICKUP`, email customers.
- Display banner/countdown is computed client-side; DB batches drive fulfillment.

## Money flow

Cart (client) → `POST /api/checkout` → server re-prices from DB, creates `Order` (PENDING_PAYMENT), calls Clover → customer redirected to Clover hosted page → webhook flips order to PAID.

## Admin (not built yet)

Manage products/batches/orders via Prisma Studio for now:

```bash
npx prisma studio
```

Next iteration: admin dashboard, email notifications (Resend), club order portal, custom stick designer.
