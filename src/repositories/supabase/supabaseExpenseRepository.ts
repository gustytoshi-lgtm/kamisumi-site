import type { ExpenseRepository } from "@/repositories/core/expenseRepository";

/**
 * Supabase 経費 repository のスケルトン。expenses（0012, owner RLS）への実装は実 DB 接続時に行う。
 * 未接続では factory が mock を返すため到達しない。
 */
function notImplemented(method: string): never {
  throw new Error(
    `SupabaseExpenseRepository.${method} is not implemented yet. Use mock mode (unset DATA_BACKEND).`,
  );
}

export const supabaseExpenseRepository: ExpenseRepository = {
  async listExpenses() {
    return notImplemented("listExpenses");
  },
  async getExpense() {
    return notImplemented("getExpense");
  },
  async createExpense() {
    return notImplemented("createExpense");
  },
  async updateExpense() {
    return notImplemented("updateExpense");
  },
  async softDeleteExpense() {
    return notImplemented("softDeleteExpense");
  },
  async restoreExpense() {
    return notImplemented("restoreExpense");
  },
};
