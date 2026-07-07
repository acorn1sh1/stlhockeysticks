import { describe, it, expect } from "vitest";
import { prismaMock, jsonRequest } from "./setup";
import { POST } from "@/app/api/club-inquiry/route";

const valid = {
  clubName: "Affton Americans",
  contact: "Coach K",
  email: "coach@affton.com",
  message: "We'd like 30 custom minis for the squad.",
};

describe("POST /api/club-inquiry", () => {
  it("400s when a field is missing", async () => {
    const res = await POST(jsonRequest({ clubName: "X", email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("persists a valid inquiry and truncates overlong fields", async () => {
    prismaMock.clubInquiry.create.mockResolvedValue({ id: "inq_1" });
    const res = await POST(jsonRequest({ ...valid, message: "m".repeat(5000) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const data = prismaMock.clubInquiry.create.mock.calls[0][0].data;
    expect(data.message.length).toBe(2000);
    expect(data.clubName).toBe("Affton Americans");
  });

  it("500s on a DB failure", async () => {
    prismaMock.clubInquiry.create.mockRejectedValue(new Error("db down"));
    const res = await POST(jsonRequest(valid));
    expect(res.status).toBe(500);
  });
});
