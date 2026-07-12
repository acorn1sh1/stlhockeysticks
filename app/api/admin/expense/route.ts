import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { EXPENSE_CATEGORIES } from "@/lib/accounting";
import { pushExpense } from "@/lib/cornishCore";

// General-ledger expenses (everything that isn't a supplier batch cost):
// packaging, Clover fees, marketing, tools, gas... Optionally linked to a
// batch so per-batch landed cost stays complete.

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// POST { expenseId? , date, category, description, amountCents, batchId? }
//  - no expenseId → create
//  - expenseId    → update provided fields
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as {
    expenseId?: string;
    date?: string;
    category?: string;
    description?: string;
    amountCents?: number;
    batchId?: string | null;
  };

  const data: Record<string, unknown> = {};
  const date = parseDate(b.date);
  if (date) data.date = date;
  if (typeof b.category === "string") {
    if (!EXPENSE_CATEGORIES.includes(b.category as (typeof EXPENSE_CATEGORIES)[number])) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }
    data.category = b.category;
  }
  if (typeof b.description === "string") data.description = b.description.trim().slice(0, 300);
  if (b.amountCents != null) {
    const n = Math.floor(Number(b.amountCents));
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }
    data.amountCents = n;
  }
  if (b.batchId === null) data.batchId = null;
  else if (typeof b.batchId === "string" && b.batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: b.batchId } });
    if (!batch) return NextResponse.json({ error: "Unknown batch" }, { status: 400 });
    data.batchId = b.batchId;
  }

  try {
    if (b.expenseId) {
      if (!Object.keys(data).length) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }
      await prisma.expense.update({ where: { id: b.expenseId }, data });
      return NextResponse.json({ ok: true });
    }
    if (!data.category || !data.description || data.amountCents == null) {
      return NextResponse.json(
        { error: "category, description, and amount are required" },
        { status: 400 }
      );
    }
    const created = await prisma.expense.create({
      data: {
        date: (data.date as Date) ?? new Date(),
        category: data.category as string,
        description: data.description as string,
        amountCents: data.amountCents as number,
        batchId: (data.batchId as string | null) ?? null,
      },
    });
    // Mirror the expense up to cornish-core's ledger. Best-effort.
    await pushExpense({
      siteExpenseId: created.id,
      date: created.date,
      category: created.category,
      description: created.description,
      amountCents: created.amountCents,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin expense error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expenseId = new URL(req.url).searchParams.get("expenseId");
  if (!expenseId) return NextResponse.json({ error: "expenseId required" }, { status: 400 });
  try {
    await prisma.expense.delete({ where: { id: expenseId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin expense delete error", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
