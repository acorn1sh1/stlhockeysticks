import { describe, it, expect } from "vitest";
import { prismaMock, jsonRequest } from "./setup";
import { POST } from "@/app/api/warranty/route";

const photo = { mimeType: "image/jpeg", dataBase64: "aGVsbG8gd29ybGQ=" };

const baseClaim = {
  orderId: "order_1",
  email: "buyer@example.com",
  name: "Buyer One",
  productName: "Elite Senior Stick",
  description: "Blade cracked on a slap shot after two weeks.",
  photos: [photo],
};

function eligibleOrder(over: Partial<Record<string, unknown>> = {}) {
  return { id: "order_1", email: "buyer@example.com", status: "PAID", ...over };
}

describe("POST /api/warranty", () => {
  it("400s on missing required fields", async () => {
    const res = await POST(jsonRequest({ orderId: "order_1", email: "buyer@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing required fields.");
  });

  it("requires at least one photo", async () => {
    const res = await POST(jsonRequest({ ...baseClaim, photos: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least one photo/i);
  });

  it("rejects more than 5 photos", async () => {
    const res = await POST(jsonRequest({ ...baseClaim, photos: Array(6).fill(photo) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no more than 5/i);
  });

  it("rejects a disallowed mime type", async () => {
    const res = await POST(
      jsonRequest({ ...baseClaim, photos: [{ mimeType: "image/gif", dataBase64: "aGk=" }] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/JPG, PNG, WEBP, or HEIC/);
  });

  it("rejects a photo over 8MB (decoded)", async () => {
    const huge = "A".repeat(11_200_000); // > 8MB decoded
    const res = await POST(
      jsonRequest({ ...baseClaim, photos: [{ mimeType: "image/png", dataBase64: huge }] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/under 8MB/i);
  });

  it("404s when order + email don't match", async () => {
    prismaMock.order.findUnique.mockResolvedValue(eligibleOrder({ email: "someone@else.com" }));
    const res = await POST(jsonRequest(baseClaim));
    expect(res.status).toBe(404);
  });

  it("404s when the order doesn't exist", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    const res = await POST(jsonRequest(baseClaim));
    expect(res.status).toBe(404);
  });

  it("400s when the order status is ineligible", async () => {
    prismaMock.order.findUnique.mockResolvedValue(eligibleOrder({ status: "PENDING_PAYMENT" }));
    const res = await POST(jsonRequest(baseClaim));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/isn't eligible/i);
  });

  it("matches email case-insensitively and creates the claim", async () => {
    prismaMock.order.findUnique.mockResolvedValue(eligibleOrder());
    prismaMock.warrantyClaim.create.mockResolvedValue({ id: "claim_1" });
    const res = await POST(jsonRequest({ ...baseClaim, email: "BUYER@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const data = prismaMock.warrantyClaim.create.mock.calls[0][0].data;
    expect(data.orderId).toBe("order_1");
    expect(data.photos.create).toHaveLength(1);
    expect(data.photos.create[0]).toMatchObject({ mimeType: "image/jpeg" });
  });

  it("strips a data: URL prefix from photo payloads", async () => {
    prismaMock.order.findUnique.mockResolvedValue(eligibleOrder());
    prismaMock.warrantyClaim.create.mockResolvedValue({ id: "claim_2" });
    const res = await POST(
      jsonRequest({ ...baseClaim, photos: [{ mimeType: "image/png", dataBase64: "data:image/png;base64,aGVsbG8=" }] })
    );
    expect(res.status).toBe(200);
    const data = prismaMock.warrantyClaim.create.mock.calls[0][0].data;
    expect(data.photos.create[0].dataBase64).toBe("aGVsbG8=");
  });

  it("500s when the DB is unavailable during lookup", async () => {
    prismaMock.order.findUnique.mockRejectedValue(new Error("db down"));
    const res = await POST(jsonRequest(baseClaim));
    expect(res.status).toBe(500);
  });
});
