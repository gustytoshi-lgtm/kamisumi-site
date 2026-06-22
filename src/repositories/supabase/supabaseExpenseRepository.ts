import type { ExpenseRepository } from "@/repositories/core/expenseRepository";
import type {
  ExpenseCategory,
  ExpenseCreateInput,
  ExpenseRecord,
  ExpenseUpdateInput,
} from "@/repositories/core/expenseModels";
import type { CurrencyCode } from "@/types/commerce";
import { CommerceError, type ActorContext } from "@/repositories/core/writeModels";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { throwCommerce } from "@/lib/supabase/errors";
import { resolveOrgId } from "@/lib/supabase/org";

/**
 * Supabase 経費 repository（expenses, 0012, owner RLS）。service role 経由。
 * 契約は mock（mockExpenseRepository）と同一。RBAC は expenseService（owner）が担う。
 * 実 DB 接続時に tests/expenseContract.supabase.test.ts（実 DB 必須・既定 skip）で mock と同挙動を検証する。
 */
type Db = ReturnType<typeof getSupabaseAdminClient>;
function db(): Db {
  return getSupabaseAdminClient();
}

function mapExpense(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    expenseDate: row.expense_date as string,
    category: row.category as ExpenseCategory,
    amount: {
      currency: row.currency as CurrencyCode,
      amountMinor: Number(row.amount_minor ?? 0),
    },
    note: (row.note as string | null) ?? undefined,
    createdBy: (row.created_by as string | null) ?? undefined,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
    deletedAt: (row.deleted_at as string | null) ?? undefined,
  };
}

async function getOrThrow(id: string): Promise<ExpenseRecord> {
  const client = db();
  const { data, error } = await client.from("expenses").select("*").eq("id", id).maybeSingle();
  if (error) throwCommerce(error);
  if (!data) throw new CommerceError("not_found", `expense ${id} not found`);
  return mapExpense(data as Record<string, unknown>);
}

export const supabaseExpenseRepository: ExpenseRepository = {
  async listExpenses(options) {
    const client = db();
    let query = client.from("expenses").select("*").order("expense_date", { ascending: false });
    if (!options?.includeDeleted) query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) throwCommerce(error);
    return (data ?? []).map((r) => mapExpense(r as Record<string, unknown>));
  },
  async getExpense(id) {
    const client = db();
    const { data, error } = await client.from("expenses").select("*").eq("id", id).maybeSingle();
    if (error) throwCommerce(error);
    return data ? mapExpense(data as Record<string, unknown>) : null;
  },
  async createExpense(input: ExpenseCreateInput, ctx: ActorContext) {
    const client = db();
    const org = await resolveOrgId(client, input.organizationId);
    const { data, error } = await client
      .from("expenses")
      .insert({
        organization_id: org,
        expense_date: input.expenseDate,
        category: input.category,
        currency: input.currency,
        amount_minor: input.amountMinor,
        note: input.note,
        created_by: ctx.userId,
      })
      .select("*")
      .single();
    if (error) throwCommerce(error);
    return mapExpense(data as Record<string, unknown>);
  },
  async updateExpense(id, patch: ExpenseUpdateInput, _ctx) {
    void _ctx;
    const client = db();
    const update: Record<string, unknown> = {};
    if (patch.expenseDate !== undefined) update.expense_date = patch.expenseDate;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.amountMinor !== undefined) update.amount_minor = patch.amountMinor;
    if (patch.note !== undefined) update.note = patch.note;
    if (Object.keys(update).length > 0) {
      const { error } = await client.from("expenses").update(update).eq("id", id);
      if (error) throwCommerce(error);
    }
    return getOrThrow(id);
  },
  async softDeleteExpense(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
  async restoreExpense(id, _ctx) {
    void _ctx;
    const client = db();
    const { error } = await client.from("expenses").update({ deleted_at: null }).eq("id", id);
    if (error) throwCommerce(error);
    return getOrThrow(id);
  },
};
