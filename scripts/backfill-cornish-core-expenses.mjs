// One-off: push every existing STL Expense row into cornish-core's ledger.
// Safe to re-run — ingest is idempotent on (brand, siteExpenseId), so
// already-backfilled rows are skipped server-side (updated, not duplicated).
//
// Requires the SAME env this app already uses for the live push path:
//   CORNISH_CORE_URL      e.g. http://localhost:3000 (dev) or the deployed URL
//   CORNISH_BRAND          "STICKS"
//   INGEST_SECRET_STICKS   must match cornish-core's .env value
//
// Run:
//   node scripts/backfill-cornish-core-expenses.mjs
//   node scripts/backfill-cornish-core-expenses.mjs --dry-run   (preview only)

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const BASE = process.env.CORNISH_CORE_URL;
const BRAND = process.env.CORNISH_BRAND || "STICKS";
const SECRET = process.env.INGEST_SECRET_STICKS;
const DRY_RUN = process.argv.includes("--dry-run");

if (!BASE || !SECRET) {
  console.error(
    "Missing CORNISH_CORE_URL or INGEST_SECRET_STICKS in env. Set them in .env before running."
  );
  process.exit(1);
}

function sign(payload) {
  const raw = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac("sha256", SECRET).update(`${ts}.${raw}`).digest("hex");
  return { raw, ts, signature };
}

async function pushExpense(expense) {
  const payload = {
    siteExpenseId: expense.id,
    date: expense.date.toISOString(),
    category: expense.category,
    description: expense.description,
    amountCents: expense.amountCents,
  };
  const { raw, ts, signature } = sign(payload);

  const res = await fetch(`${BASE}/api/ingest/expense`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Cornish-Brand": BRAND,
      "X-Cornish-Timestamp": ts,
      "X-Cornish-Signature": signature,
    },
    body: raw,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

async function main() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "asc" } });
  console.log(`Found ${expenses.length} STL expense(s) to backfill into cornish-core (${BASE}).`);
  if (DRY_RUN) {
    for (const e of expenses) {
      console.log(
        `[dry-run] ${e.date.toISOString().slice(0, 10)}  ${e.category.padEnd(10)}  $${(
          e.amountCents / 100
        ).toFixed(2).padStart(9)}  ${e.description}`
      );
    }
    console.log("Dry run only — nothing was sent.");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const e of expenses) {
    try {
      await pushExpense(e);
      ok++;
      console.log(`✓ ${e.id}  ${e.category}  $${(e.amountCents / 100).toFixed(2)}  ${e.description}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${e.id}  ${e.description} — ${err.message}`);
    }
  }
  console.log(`\nDone. ${ok} pushed, ${failed} failed out of ${expenses.length}.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
