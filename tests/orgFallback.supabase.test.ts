import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { shouldRunSupabaseContract, supabaseContractActor } from "./repositoryContractFixtures";
import { isUuid } from "@/lib/supabase/org";
import { supabaseExpenseRepository } from "@/repositories/supabase/supabaseExpenseRepository";

/**
 * I-023 回帰テスト（実 DB 必須・既定 skip）。
 * service 層が org 未指定時に siteConfig.organization.id（mock 用スラッグ）へフォールバックしても、
 * Supabase repo が実 org UUID へ解決し、uuid 列で破綻しないことを実 DB で確認する。
 */
if (shouldRunSupabaseContract()) {
  describe("supabase org fallback (I-023)", () => {
    it("accepts the mock org slug and persists with a real org uuid", async () => {
      const created = await supabaseExpenseRepository.createExpense(
        {
          organizationId: siteConfig.organization.id, // "org-kagurakoji"（UUID ではない）
          expenseDate: "2026-06-22",
          category: "fees",
          currency: "TWD",
          amountMinor: 777,
          note: "i023-regression",
        },
        supabaseContractActor(),
      );
      expect(isUuid(created.organizationId)).toBe(true);
      expect(created.organizationId).not.toBe(siteConfig.organization.id);
    });
  });
} else {
  describe.skip("supabase org fallback (I-023) (requires live DB)", () => {
    // SKIP 理由: 実 Supabase project / env / contract actor が未設定。
  });
}
