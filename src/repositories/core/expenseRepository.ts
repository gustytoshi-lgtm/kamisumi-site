import type { ActorContext } from "./writeModels";
import type { ExpenseCreateInput, ExpenseRecord, ExpenseUpdateInput } from "./expenseModels";

/** 経費の永続契約。mock / Supabase が同一契約を満たす。RBAC（owner）は expenseService。 */
export interface ExpenseRepository {
  listExpenses(options?: { includeDeleted?: boolean }): Promise<ExpenseRecord[]>;
  getExpense(id: string): Promise<ExpenseRecord | null>;
  createExpense(input: ExpenseCreateInput, ctx: ActorContext): Promise<ExpenseRecord>;
  updateExpense(id: string, patch: ExpenseUpdateInput, ctx: ActorContext): Promise<ExpenseRecord>;
  softDeleteExpense(id: string, ctx: ActorContext): Promise<ExpenseRecord>;
  restoreExpense(id: string, ctx: ActorContext): Promise<ExpenseRecord>;
}
