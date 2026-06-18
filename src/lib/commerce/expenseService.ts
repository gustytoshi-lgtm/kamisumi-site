import { siteConfig } from "@/config/site";
import type { ExpenseRepository } from "@/repositories/core/expenseRepository";
import {
  isExpenseCategory,
  type ExpenseCreateInput,
  type ExpenseUpdateInput,
} from "@/repositories/core/expenseModels";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { can, type Permission } from "./rbac";

/**
 * 経費サービス。経費は原価/採算の機微情報のため owner（purchase:manage）に限定。
 * front_staff/inventory_staff からは読取も含めて遮断する。
 */
const EXPENSE_PERMISSION: Permission = "purchase:manage";

function assertCan(ctx: ActorContext): void {
  if (!can(ctx.role, EXPENSE_PERMISSION)) {
    throw new CommerceError("forbidden", `role ${ctx.role} lacks ${EXPENSE_PERMISSION}`);
  }
}

export function createExpenseService(repo: ExpenseRepository) {
  return {
    async listExpenses(ctx: ActorContext, options?: { includeDeleted?: boolean }) {
      assertCan(ctx);
      return repo.listExpenses(options);
    },
    async getExpense(ctx: ActorContext, id: string) {
      assertCan(ctx);
      return repo.getExpense(id);
    },
    async createExpense(
      ctx: ActorContext,
      input: Omit<ExpenseCreateInput, "organizationId"> & { organizationId?: string },
    ) {
      assertCan(ctx);
      if (!input.expenseDate) throw new CommerceError("validation", "expenseDate is required");
      if (!isExpenseCategory(input.category)) {
        throw new CommerceError("validation", `invalid category: ${input.category}`);
      }
      if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
        throw new CommerceError("validation", "amount must be a non-negative integer");
      }
      return repo.createExpense(
        { ...input, organizationId: input.organizationId ?? siteConfig.organization.id },
        ctx,
      );
    },
    async updateExpense(ctx: ActorContext, id: string, patch: ExpenseUpdateInput) {
      assertCan(ctx);
      if (patch.category !== undefined && !isExpenseCategory(patch.category)) {
        throw new CommerceError("validation", `invalid category: ${patch.category}`);
      }
      if (patch.amountMinor !== undefined && (!Number.isInteger(patch.amountMinor) || patch.amountMinor < 0)) {
        throw new CommerceError("validation", "amount must be a non-negative integer");
      }
      return repo.updateExpense(id, patch, ctx);
    },
    async deleteExpense(ctx: ActorContext, id: string) {
      assertCan(ctx);
      return repo.softDeleteExpense(id, ctx);
    },
    async restoreExpense(ctx: ActorContext, id: string) {
      assertCan(ctx);
      return repo.restoreExpense(id, ctx);
    },
  };
}

export type ExpenseService = ReturnType<typeof createExpenseService>;
