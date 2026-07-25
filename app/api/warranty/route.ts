import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientKey, consumeRateLimit } from "@/lib/rateLimit";
import { looksLikeOrderId, parseOrderNumber, formatOrderNumber } from "@/lib/orderNumber";
import { sendEmail } from "@/lib/email";

const WARRANTY_DAYS = 30;
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB per image (decoded)
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// base64 -> decoded byte size (without decoding)
function b64Bytes(s: string) {
  const len = s.length;
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - pad;
}

type PhotoIn = { mimeType?: string; dataBase64?: string };

export async function POST(req: Request) {
  // Order/email lookup below is an enumeration surface, and photos are
  // heavy (up to 5 x 8MB per claim) — throttle to block brute force + storage abuse.
  if (!consumeRateLimit(`warranty:${clientKey(req)}`, { windowMs: 10 * 60 * 1000, max: 5 })) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const orderId = String(body.orderId ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const phone = body.phone ? String(body.phone).trim().slice(0, 40) : null;
  const productName = String(body.productName ?? "").trim();
  const description = String(body.description ?? "").trim();
  const photos: PhotoIn[] = Array.isArray(body.photos) ? body.photos : [];

  if (!orderId || !email || !name || !productName || !description) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Photos are mandatory for a warranty claim.
  if (photos.length === 0) {
    return NextResponse.json(
      { error: "At least one photo of the broken stick is required." },
      { status: 400 }
    );
  }
  if (photos.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Please attach no more than ${MAX_PHOTOS} photos.` },
      { status: 400 }
    );
  }
  const cleanPhotos: { mimeType: string; dataBase64: string }[] = [];
  for (const p of photos) {
    const mime = String(p.mimeType ?? "").toLowerCase();
    const data = String(p.dataBase64 ?? "").replace(/^data:[^,]+,/, "");
    if (!ALLOWED_MIME.includes(mime) || !data) {
      return NextResponse.json(
        { error: "Photos must be JPG, PNG, WEBP, or HEIC images." },
        { status: 400 }
      );
    }
    if (b64Bytes(data) > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Each photo must be under 8MB." },
        { status: 400 }
      );
    }
    cleanPhotos.push({ mimeType: mime, dataBase64: data });
  }

  // Verify the order exists and belongs to this customer.
  //
  // `orderId` here is whatever the customer typed. Accept the human order
  // number ("STL-1042", "1042", mangled dashes and all) as the primary form,
  // and still accept a raw cuid so claims on orders placed before order
  // numbers existed — and anyone pasting from an old link — keep working.
  let order;
  try {
    const num = parseOrderNumber(orderId);
    order =
      num != null
        ? await prisma.order.findUnique({ where: { orderNumber: num } })
        : looksLikeOrderId(orderId)
          ? await prisma.order.findUnique({ where: { id: orderId } })
          : null;
  } catch (e) {
    console.error("warranty order lookup error", e);
    return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
  }
  if (!order || order.email.toLowerCase() !== email) {
    return NextResponse.json(
      {
        error:
          "We couldn't match that order number and email. Your order number looks like STL-1042 and is in your confirmation email.",
      },
      { status: 404 }
    );
  }

  // Only paid/fulfilled orders are eligible.
  const eligible = ["PAID", "READY_FOR_PICKUP", "PICKED_UP"];
  if (!eligible.includes(order.status)) {
    return NextResponse.json(
      { error: "That order isn't eligible for a warranty claim." },
      { status: 400 }
    );
  }

  // 30-day window runs from pickup date if known, else order date.
  const purchaseDate = order.pickedUpAt ?? order.createdAt;
  const ageDays =
    (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > WARRANTY_DAYS) {
    return NextResponse.json(
      {
        error: `Warranty is ${WARRANTY_DAYS} days from purchase. This order is ${Math.floor(
          ageDays
        )} days old.`,
      },
      { status: 400 }
    );
  }

  try {
    await prisma.warrantyClaim.create({
      data: {
        orderId: order.id,
        email,
        name: name.slice(0, 200),
        phone,
        productName: productName.slice(0, 200),
        description: description.slice(0, 4000),
        photos: { create: cleanPhotos },
      },
    });
  } catch (e) {
    console.error("warranty claim create error", e);
    return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
  }

  // Notify the shop. Fire-and-forget — claim is already saved. reply_to = the
  // customer so you can respond straight from the inbox. Photos aren't attached
  // (they're up to 5×8MB) — review + resolve them in /admin → Warranty.
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
    );
  sendEmail({
    subject: `Warranty claim: ${productName} (order ${formatOrderNumber(order.orderNumber)})`,
    replyTo: email,
    html:
      `<h2>New warranty claim</h2>` +
      `<p><strong>Order:</strong> ${formatOrderNumber(order.orderNumber)}</p>` +
      `<p><strong>Product:</strong> ${esc(productName)}</p>` +
      `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;${phone ? ` · ${esc(phone)}` : ""}</p>` +
      `<p><strong>${cleanPhotos.length} photo(s)</strong> attached to the claim — view them in <a href="${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/admin">/admin → Warranty</a>.</p>` +
      `<p style="white-space:pre-wrap">${esc(description)}</p>`,
  }).catch((e) => console.error("warranty email failed", e));

  return NextResponse.json({ ok: true });
}
