import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Statuses that represent a confirmed sale — the counts a manufacturer
// should actually build. Excludes PENDING_PAYMENT (never completed),
// CANCELLED, and REFUNDED.
const CONFIRMED = ["PAID", "READY_FOR_PICKUP", "PICKED_UP"] as const;

type SelectedOptions = {
  flex?: string;
  curve?: string;
  hand?: string;
  color?: string;
  length?: string;
  paddleSize?: string;
  customName?: string;
};

const dash = (v: unknown) => (v == null || v === "" ? "—" : String(v));

// Exports one batch as a manufacturer-ready .xlsx: aggregated build counts
// by product + spec (flex/curve/hand/color/length/paddle), a separate sheet
// for units needing a printed custom name (can't be aggregated — each is
// unique), and a reference sheet of the orders that make up the batch.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const batchId = new URL(req.url).searchParams.get("batchId");
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { stockLines: { include: { product: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { batchId, status: { in: [...CONFIRMED] } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const pendingCount = await prisma.order.count({
    where: { batchId, status: { notIn: [...CONFIRMED, "CANCELLED", "REFUNDED"] } },
  });

  type AggKey = string;
  const agg = new Map<
    AggKey,
    { product: string; category: string; flex: string; curve: string; hand: string; color: string; length: string; qty: number }
  >();
  const customRows: {
    product: string;
    flex: string;
    curve: string;
    hand: string;
    color: string;
    length: string;
    customName: string;
    qty: number;
    orderDate: Date;
    customer: string;
  }[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      const o = (item.options as SelectedOptions | null) ?? {};
      const row = {
        flex: dash(o.flex),
        curve: dash(o.curve),
        hand: dash(o.hand),
        color: dash(o.color),
        length: dash(o.length ?? o.paddleSize),
      };
      if (o.customName?.trim()) {
        customRows.push({
          product: item.product.name,
          ...row,
          customName: o.customName.trim(),
          qty: item.quantity,
          orderDate: order.createdAt,
          customer: `${order.name} (${order.email})`,
        });
        continue;
      }
      const key = [item.product.name, item.product.category, row.flex, row.curve, row.hand, row.color, row.length].join("|");
      const existing = agg.get(key);
      if (existing) existing.qty += item.quantity;
      else
        agg.set(key, {
          product: item.product.name,
          category: item.product.category,
          ...row,
          qty: item.quantity,
        });
    }
  }

  // Inventory restock lines — admin-added replenishment of in-stock SKUs,
  // built from each SKU's locked fixed* spec. Tagged so the sheet shows
  // they're stock, not a customer order.
  for (const sl of batch.stockLines) {
    const p = sl.product;
    const row = {
      flex: dash(p.fixedFlex),
      curve: dash(p.fixedCurve),
      hand: dash(p.fixedHand),
      color: dash(p.fixedColor),
      length: dash(p.fixedLength),
    };
    const key = [`${p.name} (RESTOCK)`, p.category, row.flex, row.curve, row.hand, row.color, row.length].join("|");
    const existing = agg.get(key);
    if (existing) existing.qty += sl.qty;
    else agg.set(key, { product: `${p.name} (RESTOCK)`, category: p.category, ...row, qty: sl.qty });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "STL Hockey Sticks";
  wb.created = new Date();

  // ---- Build Summary ----
  const summary = wb.addWorksheet("Build Summary");
  summary.columns = [
    { width: 32 }, { width: 13 }, { width: 8 }, { width: 10 }, { width: 8 }, { width: 14 }, { width: 10 }, { width: 8 },
  ];
  summary.mergeCells("A1:H1");
  summary.getCell("A1").value = `${batch.name} — Manufacturing Build Sheet`;
  summary.getCell("A1").font = { bold: true, size: 14 };
  summary.mergeCells("A2:H2");
  summary.getCell("A2").value =
    `Cutoff ${batch.cutoffDate.toDateString()} · Pickup ${batch.pickupStart.toDateString()}–${batch.pickupEnd.toDateString()} · ` +
    `${orders.length} confirmed order(s)${pendingCount ? ` · ${pendingCount} not yet paid (excluded)` : ""} · generated ${new Date().toLocaleString("en-US")}`;
  summary.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF666666" } };

  const headerRow = summary.getRow(4);
  headerRow.values = ["Product", "Category", "Flex", "Curve", "Hand", "Color", "Length/Paddle", "Qty"];
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };

  const sortedAgg = [...agg.values()].sort(
    (a, b) => a.product.localeCompare(b.product) || a.flex.localeCompare(b.flex)
  );
  let r = 5;
  let totalQty = 0;
  for (const row of sortedAgg) {
    summary.getRow(r).values = [row.product, row.category.replace("_", " "), row.flex, row.curve, row.hand, row.color, row.length, row.qty];
    totalQty += row.qty;
    r++;
  }
  const totalRow = summary.getRow(r + 1);
  totalRow.values = ["", "", "", "", "", "", "Total", totalQty];
  totalRow.font = { bold: true };

  // ---- Custom Names (name-printed units — can't be aggregated) ----
  const names = wb.addWorksheet("Custom Names");
  names.columns = [
    { width: 32 }, { width: 8 }, { width: 10 }, { width: 8 }, { width: 14 }, { width: 10 }, { width: 18 }, { width: 6 }, { width: 26 }, { width: 12 },
  ];
  const namesHeader = names.getRow(1);
  namesHeader.values = ["Product", "Flex", "Curve", "Hand", "Color", "Length", "Custom Name", "Qty", "Customer", "Order Date"];
  namesHeader.font = { bold: true };
  namesHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  customRows
    .sort((a, b) => a.product.localeCompare(b.product) || a.customName.localeCompare(b.customName))
    .forEach((row, i) => {
      names.getRow(i + 2).values = [
        row.product, row.flex, row.curve, row.hand, row.color, row.length, row.customName, row.qty, row.customer, row.orderDate.toDateString(),
      ];
    });
  if (!customRows.length) {
    names.getRow(2).values = ["No custom-name orders in this batch."];
  }

  // ---- Orders reference ----
  const ordersSheet = wb.addWorksheet("Orders in Batch");
  ordersSheet.columns = [{ width: 12 }, { width: 26 }, { width: 26 }, { width: 16 }, { width: 12 }];
  const ordersHeader = ordersSheet.getRow(1);
  ordersHeader.values = ["Date", "Customer", "Email", "Status", "Subtotal"];
  ordersHeader.font = { bold: true };
  ordersHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
  orders.forEach((o, i) => {
    ordersSheet.getRow(i + 2).values = [
      o.createdAt.toDateString(), o.name, o.email, o.status.replaceAll("_", " "), `$${(o.subtotalCents / 100).toFixed(2)}`,
    ];
  });

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${batch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-build-sheet.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
