import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

const STATUSES = ["SUBMITTED", "APPROVED", "DENIED", "REPLACED", "REFUNDED"];

// Update a warranty claim's status / notes.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, status, adminNotes } = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    adminNotes?: string;
  };
  if (!id || !status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid claim or status" }, { status: 400 });
  }
  try {
    await prisma.warrantyClaim.update({
      where: { id },
      data: {
        status: status as never,
        ...(adminNotes != null ? { adminNotes: String(adminNotes).slice(0, 2000) } : {}),
      },
    });
  } catch (e) {
    console.error("admin warranty error", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
