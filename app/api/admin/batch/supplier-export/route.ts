import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { REVENUE_STATUSES } from "@/lib/accounting";

// Exports one batch as a supplier-ready order sheet in the Junda
// "Quotation list" format (matches the .xlsx the factory sends back):
// company header block, then one line per build spec with Serial number /
// Product Name / Length / Model / FLEX / right-left / handle / blade /
// Printing / Unit(qty) / NAME / Price / total, then Freight + TOTAL rows
// with live formulas so Jackson can adjust prices and the sheet re-totals.
//
// Price column is pre-filled from this batch's unit-cost overrides
// (BatchUnitCost) falling back to Product.costCents; a $0 cost is left
// blank for the supplier to quote.

type SelectedOptions = {
  flex?: string;
  curve?: string;
  hand?: string;
  color?: string;
  length?: string;
  paddleSize?: string;
  customName?: string;
};

// Supplier knows sticks by tier code, not our marketing names.
function supplierName(p: { sizingTier: string | null; category: string; name: string }): string {
  if (p.sizingTier === "SENIOR") return "SR";
  if (p.sizingTier === "INT" || p.sizingTier === "INTERMEDIATE") return "INT";
  if (p.sizingTier === "JR" || p.sizingTier === "JUNIOR") return "JR";
  if (p.sizingTier === "YTH" || p.sizingTier === "YOUTH") return "YTH";
  if (p.category.includes("MINI")) return "MINI";
  if (p.category.includes("GOALIE")) return "GOALIE";
  return p.name;
}

const numOrBlank = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : v === "—" || v === "" ? null : v;
};

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const batchId = new URL(req.url).searchParams.get("batchId");
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { unitCosts: true, stockLines: { include: { product: true } } },
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { batchId, status: { in: [...REVENUE_STATUSES] } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const costOverride = new Map(batch.unitCosts.map((u) => [u.productId, u.unitCostCents]));

  // Aggregate identical build specs; custom-name units stay one line each.
  type Line = {
    name: string;
    length: string | number | null;
    model: string;
    flex: string | number | null;
    hand: string;
    color: string;
    qty: number;
    customName: string;
    priceCents: number;
  };
  const agg = new Map<string, Line>();
  const customLines: Line[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      const o = (item.options as SelectedOptions | null) ?? {};
      const p = item.product;
      const line: Line = {
        name: supplierName(p),
        length: numOrBlank(String(o.length ?? o.paddleSize ?? p.fixedLength ?? p.fixedPaddle ?? "")),
        model: String(o.curve ?? p.fixedCurve ?? ""),
        flex: numOrBlank(String(o.flex ?? p.fixedFlex ?? "")),
        hand: String(o.hand ?? p.fixedHand ?? "Right"),
        color: String(o.color ?? p.fixedColor ?? ""),
        qty: item.quantity,
        customName: o.customName?.trim() ?? "",
        priceCents: costOverride.get(p.id) ?? p.costCents,
      };
      if (line.customName) {
        customLines.push(line);
        continue;
      }
      const key = [line.name, line.length, line.model, line.flex, line.hand, line.color, line.priceCents].join("|");
      const existing = agg.get(key);
      if (existing) existing.qty += line.qty;
      else agg.set(key, line);
    }
  }

  // Inventory restock lines (admin-added in-stock replenishment riding on
  // this supplier order). Build spec comes from the SKU's locked fixed*
  // fields; identical specs merge with pre-order lines above.
  for (const sl of batch.stockLines) {
    const p = sl.product;
    const line: Line = {
      name: supplierName(p),
      // Goalie restock lines are sized by paddle, not length.
      length: numOrBlank(String(p.fixedLength ?? p.fixedPaddle ?? "")),
      model: String(p.fixedCurve ?? ""),
      flex: numOrBlank(String(p.fixedFlex ?? "")),
      hand: String(p.fixedHand ?? "Right"),
      color: String(p.fixedColor ?? ""),
      qty: sl.qty,
      customName: "",
      priceCents: costOverride.get(p.id) ?? p.costCents,
    };
    const key = [line.name, line.length, line.model, line.flex, line.hand, line.color, line.priceCents].join("|");
    const existing = agg.get(key);
    if (existing) existing.qty += line.qty;
    else agg.set(key, line);
  }

  const lines = [
    ...[...agg.values()].sort((a, b) => a.name.localeCompare(b.name) || String(a.flex).localeCompare(String(b.flex))),
    ...customLines.sort((a, b) => a.name.localeCompare(b.name) || a.customName.localeCompare(b.customName)),
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "STL Hockey Sticks";
  wb.created = new Date();
  const ws = wb.addWorksheet("Sheet1");

  // Column widths mirror the factory's file (T holds totals, O the names).
  const widths: Record<string, number> = { A: 14, B: 14, C: 10, D: 12, E: 12, F: 9, G: 8, H: 10, I: 14, J: 12, K: 14, L: 16, M: 8, N: 14.1, O: 21.6, P: 10, Q: 18.1, R: 8, S: 10, T: 14.4, U: 10 };
  for (const [col, w] of Object.entries(widths)) ws.getColumn(col).width = w;

  // ---- Header block (matches Junda quotation layout) ----
  ws.getCell("A1").value = "Huizhou Junda Composite Material  Co., Ltd";
  ws.getCell("A1").font = { bold: true, size: 36 };
  ws.getRow(1).height = 45.85;
  ws.getCell("A2").value = "惠州郡达复合材料有限公司";
  ws.getCell("A2").font = { size: 24 };
  ws.getRow(2).height = 35.55;
  ws.getCell("A3").value = "Quotation list    ";
  ws.getCell("A3").font = { size: 22 };
  ws.getRow(3).height = 27;
  ws.getCell("A4").value = "报价单";
  ws.getRow(4).height = 27.85;
  ws.getCell("A5").value = `Quotation number：${batch.name.replace(/\s+/g, "-").toUpperCase()}-${new Date().toISOString().slice(0, 10)}`;
  ws.getRow(5).height = 27;
  ws.getCell("A6").value = "Customer name: STL Hockey Sticks";
  ws.getCell("K6").value = "FROM：Huizhou Junda Composite Material  Co., Ltd";
  ws.getCell("A7").value = "ATTN：Jackson Li";
  ws.getCell("K7").value = "Contact person：Jackson Li";
  ws.getCell("A8").value = "TEL:                   ";
  ws.getCell("K8").value = "TEL:13302993887          FAX:(0752)-3628509";
  ws.getCell("O8").value = "Email address:";
  ws.getCell("Q8").value = "1311950052@qq.com";
  ws.getCell("A9").value = "Customer address：";
  ws.getCell("K9").value = "Factory address：Xin Wei Zhen Dong Feng Cun Weixin Group, Huiyang District, Huizhou City, Guangdong Province, China";

  // ---- Column headers (row 10) ----
  const headers = [
    "Serial number/编号", "Product Name/产品名称", "Product picture/图片", "Composition/成分（g）",
    "Length/长度（Inch）", "Model/摸型", "FLEX", "right/left", " Handl woven/手柄面布", "Blade/打击板面布",
    "Weight/重量（g）", "Printing/色漆", "Unit/单位", "LOGO", "NAME", "kick point",
    "Surface brightness/面漆", "Blade", "Price", "total", "3D logo",
  ];
  const headerRow = ws.getRow(10);
  headerRow.values = headers;
  headerRow.height = 42.45;
  headerRow.eachCell((c) => {
    c.font = { size: 11 };
    c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  // ---- Item lines (row 11+) ----
  const firstItem = 11;
  lines.forEach((l, i) => {
    const r = firstItem + i;
    const row = ws.getRow(r);
    row.values = [
      i + 1,               // A serial
      l.name,              // B product name (SR/INT/JR/YTH/MINI)
      null,                // C picture
      1,                   // D composition
      l.length,            // E length
      l.model,             // F model / curve
      l.flex,              // G flex
      l.hand,              // H right/left
      "18K",               // I handle weave
      "18K",               // J blade weave
      null,                // K weight (factory fills)
      l.color,             // L printing
      l.qty,               // M unit qty
      "STL",               // N logo
      l.customName || null, // O printed name
      null,                // P kick point (factory fills)
      "Bright and elastic", // Q surface
      "3D",                // R blade
      l.priceCents > 0 ? l.priceCents / 100 : null, // S price (USD)
      { formula: `S${r}*M${r}` }, // T total
      null,                // U 3D logo
    ];
    row.height = 15.4;
    row.eachCell({ includeEmpty: false }, (c) => {
      c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    });
  });

  // ---- Footer: qty subtotal, Freight, LOGO, TOTAL ----
  const lastItem = firstItem + Math.max(lines.length, 1) - 1;
  const fr = lastItem + 1; // freight row
  ws.getCell(`M${fr}`).value = { formula: `SUM(M${firstItem}:M${lastItem})` };
  ws.getCell(`S${fr}`).value = "Freight";
  ws.getCell(`S${fr}`).font = { bold: true, size: 14 };
  ws.getCell(`T${fr}`).value = batch.freightCents > 0 ? batch.freightCents / 100 : null;
  ws.getCell(`T${fr}`).font = { bold: true, size: 14 };
  ws.getRow(fr).height = 18.4;

  ws.getCell(`S${fr + 1}`).value = "LOGO";
  ws.getCell(`S${fr + 1}`).font = { bold: true, size: 14 };
  ws.getRow(fr + 1).height = 18.45;

  ws.getCell(`S${fr + 2}`).value = "TOTAL";
  ws.getCell(`S${fr + 2}`).font = { bold: true, size: 14 };
  ws.getRow(fr + 2).height = 18.45;
  ws.getCell(`T${fr + 3}`).value = { formula: `SUM(T${firstItem}:T${fr + 1})` };

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `${batch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-supplier-order.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
