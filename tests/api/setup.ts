import { vi, beforeEach } from "vitest";

// Shared mocks for the API route tests. Registered here (a setupFile) so every
// app/api/** test gets the same stubbed Prisma / Clover / email surface without
// repeating vi.mock in each file.
//
// vi.mock is hoisted above module scope, so its factory can't close over normal
// top-level consts. vi.hoisted() creates the mock handles in that hoisted scope
// and the factories reference them safely.
const mocks = vi.hoisted(() => ({
  prisma: {
    product: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    order: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    orderItem: { findMany: vi.fn() },
    coupon: { findUnique: vi.fn(), update: vi.fn() },
    batch: { updateMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    warrantyClaim: { create: vi.fn() },
    clubInquiry: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  createHostedCheckout: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/clover", () => ({ createHostedCheckout: mocks.createHostedCheckout }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));

// Test-facing handles.
export const prismaMock = mocks.prisma;
export const createHostedCheckoutMock = mocks.createHostedCheckout;
export const sendEmailMock = mocks.sendEmail;

beforeEach(() => {
  vi.clearAllMocks();
  // Safe defaults; individual tests override as needed.
  prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  sendEmailMock.mockResolvedValue(undefined);
});

// Build a Request the App Router handlers accept. They only use req.json(),
// so a minimal shim keeps tests fast and framework-light.
export function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
