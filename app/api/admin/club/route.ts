import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Manage the admin-editable Club catalog. Clubs feed the customer "choose your
// club" picker on the custom club mini and the club field in the in-stock SKU
// builder.
//  - id + delete:true → delete (warns if products reference the club name)
//  - id present        → patch (name/rename, active, sortOrder)
//  - id absent         → create a new club by name
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : "";
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 100) : "";

  try {
    if (b.delete === true) {
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const club = await prisma.club.findUnique({ where: { id } });
      if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const inUse = await prisma.product.count({ where: { clubName: club.name } });
      if (inUse > 0 && b.force !== true) {
        return NextResponse.json(
          { error: `${inUse} product(s) reference "${club.name}". Delete anyway? Those products keep their club name.`, inUse },
          { status: 409 }
        );
      }
      await prisma.club.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    // Club design image: a data URL (uploaded file) or http URL. Capped at
    // ~4MB of characters so a base64 photo fits comfortably under the platform
    // request limit; keep uploads web-sized.
    const MAX_IMAGE_CHARS = 4_000_000;
    const imageProvided = "imageUrl" in b;
    const imageUrl =
      b.imageUrl === null || b.imageUrl === ""
        ? null
        : typeof b.imageUrl === "string"
          ? b.imageUrl.slice(0, MAX_IMAGE_CHARS)
          : undefined;

    if (id) {
      const data: Record<string, unknown> = {};
      if (name) data.name = name;
      if (typeof b.active === "boolean") data.active = b.active;
      if (imageProvided) data.imageUrl = imageUrl;
      if (b.sortOrder != null) data.sortOrder = Math.floor(Number(b.sortOrder));
      if (!Object.keys(data).length) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      }
      await prisma.club.update({ where: { id }, data });
      return NextResponse.json({ ok: true });
    }

    if (!name) return NextResponse.json({ error: "Club name required" }, { status: 400 });
    const dupe = await prisma.club.findUnique({ where: { name } });
    if (dupe) return NextResponse.json({ error: "That club already exists." }, { status: 409 });
    await prisma.club.create({
      data: {
        name,
        sortOrder: Math.floor(Number(b.sortOrder ?? 99)) || 99,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin club error", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
