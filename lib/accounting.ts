// Shared accounting constants + helpers for the admin books.

export const EXPENSE_CATEGORIES = [
  "SHIPPING",
  "TARIFFS",
  "SUPPLIES",
  "FEES",
  "MARKETING",
  "EQUIPMENT",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Order statuses that count as recognized revenue.
export const REVENUE_STATUSES = ["PAID", "READY_FOR_PICKUP", "PICKED_UP"] as const;

export const fmtUsd = (centsVal: number) =>
  (centsVal / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
