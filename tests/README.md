# Test automation — stlhockeysticks

Full pipeline: unit → API/integration → build → E2E + accessibility → performance (Lighthouse + k6). Every layer is wired into `.github/workflows/ci.yml` and gates pull requests to `main`.

## Layout

```
tests/
  unit/        Vitest — pure logic in lib/ (pricing, validation, discounts, batch, coupons)
  api/         Vitest — App Router route handlers with Prisma + Clover + email mocked
  e2e/         Playwright — real browser flows + axe accessibility scans
  perf/        k6 load script (Lighthouse config lives in ../lighthouserc.json)
```

## Commands

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc` over app + test sources |
| `npm run test` | Vitest unit + API suites (the regression gate) |
| `npm run test:unit` / `npm run test:api` | One project only |
| `npm run test:cov` | Unit + API with V8 coverage + thresholds |
| `npm run test:e2e` | Playwright (builds + boots the app via `webServer`) |
| `npm run test:a11y` | Only the axe-tagged specs (`@a11y`) |
| `npm run test:perf:lhci` | Lighthouse CI against budgets in `lighthouserc.json` |
| `npm run test:perf:load` | k6 load test (`BASE_URL` env, defaults to localhost) |
| `npm run test:all` | typecheck + unit/API + E2E locally |

## What each layer covers

**Unit** — server-side pricing (`unitPriceCents`), option validation (`validateOptions`), the club bulk discount (`clubDiscountCents`), the monthly-batch date math (`nextBatch`, with faked clock), option summaries, price formatting, and full coupon validation (percent/fixed, expiry, redemption caps, min-spend, clamping).

**API/integration** — the four public POST routes. Prisma, Clover, and email are mocked so these are fast and deterministic. Focus areas: server re-prices every line (client prices are never trusted), club + coupon discounts stack correctly, batch attachment when stock can't cover an order, payment-processor failure cancels the order (502), warranty photo/mime/size/eligibility rules, and DB-failure fallbacks.

**E2E + a11y** — Playwright drives Chromium + a mobile profile against a real built server backed by a real Postgres. Flows: browse home/sticks/product, add to cart + reject a bad promo code, warranty form validation. `a11y.spec.ts` runs axe (WCAG 2.1 A/AA) on six pages and fails on any violation.

**Performance** — Lighthouse CI asserts perf/accessibility/SEO scores and Core Web Vitals budgets (LCP < 3s, CLS < 0.1) across four pages. k6 ramps browse traffic + a 25 req/s coupon-API load with p95 < 800ms and < 1% error-rate thresholds.

## Regression policy

"Regression" here is not a separate framework — it's the accumulated unit + API + E2E suites run as a required status check on every PR (see the `quality` and `e2e` jobs). Any new bug fix should land with a test that would have caught it, so the suite grows into the regression net. The `load` job runs only on pushes to `main` to keep PR feedback fast.

## Running E2E / perf locally

Needs a Postgres. Point `DATABASE_URL` at it, then:

```bash
npm run db:push && npm run db:seed
npm run test:e2e:install   # one-time: Playwright browsers
npm run test:e2e
```

Against an already-running or deployed server, set `E2E_BASE_URL` (Playwright skips its managed server) or `BASE_URL` for k6.
