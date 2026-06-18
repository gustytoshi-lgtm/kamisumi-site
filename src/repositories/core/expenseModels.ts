import type { CurrencyCode, Money } from "@/types/commerce";

/**
 * 経費（営業経費）の永続モデル（expenses, 0012）。機微情報のため owner 限定（expenseService / RLS）。
 * 金額は最小通貨単位の整数（Money）。
 */
export type ExpenseCategory =
  | "shipping_supplies"
  | "transport"
  | "fees"
  | "rent"
  | "utilities"
  | "marketing"
  | "other";

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "shipping_supplies",
  "transport",
  "fees",
  "rent",
  "utilities",
  "marketing",
  "other",
];

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export type ExpenseRecord = {
  id: string;
  organizationId: string;
  expenseDate: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: Money;
  note?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type ExpenseCreateInput = {
  organizationId?: string;
  expenseDate: string;
  category: ExpenseCategory;
  currency: CurrencyCode;
  amountMinor: number;
  note?: string;
};

export type ExpenseUpdateInput = Partial<{
  expenseDate: string;
  category: ExpenseCategory;
  amountMinor: number;
  note: string;
}>;

/** 経費合計（同一通貨のみ。混在時は通貨別に集計するため、ここでは通貨指定で合算）。 */
export function sumExpensesMinor(records: ExpenseRecord[], currency: CurrencyCode): number {
  return records
    .filter((r) => r.amount.currency === currency && !r.deletedAt)
    .reduce((acc, r) => acc + r.amount.amountMinor, 0);
}
