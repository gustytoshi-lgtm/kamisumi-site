import { describe, expect, it } from "vitest";
import type { SettingsRepository } from "@/repositories/core/settingsRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

export function runSettingsContract(
  name: string,
  makeRepo: () => SettingsRepository,
  ctx: ActorContext,
) {
  describe(`settings repository contract: ${name}`, () => {
    it("upserts a setting and records history", async () => {
      const repo = makeRepo();
      const nextValue = "24";
      const updated = await repo.updateSetting("hold_hours", nextValue, ctx);
      expect(updated).toMatchObject({ key: "hold_hours", value: nextValue, updatedBy: ctx.userId });
      expect(await repo.getSetting("hold_hours")).toMatchObject({ value: nextValue });
      expect((await repo.listSettings()).some((s) => s.key === "hold_hours")).toBe(true);

      const history = await repo.listHistory("hold_hours");
      expect(history.some((h) => h.key === "hold_hours" && h.newValue === nextValue && h.changedBy === ctx.userId)).toBe(
        true,
      );
    });
  });
}
