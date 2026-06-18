import { describe, expect, it } from "vitest";
import { createProcurementService } from "@/lib/commerce/procurementService";
import { createMockProcurementRepository } from "@/repositories/mock/mockProcurementRepository";
import type { ActorContext } from "@/repositories/core/writeModels";

const owner: ActorContext = { userId: "owner", role: "owner" };
const frontStaff: ActorContext = { userId: "fs", role: "front_staff" };

function service() {
  return createProcurementService(createMockProcurementRepository());
}

describe("procurementService - RBAC", () => {
  it("lets an owner create and list suppliers", async () => {
    const svc = service();
    const created = await svc.createSupplier(owner, { name: "Owner Supplier" });
    expect(created.name).toBe("Owner Supplier");
    expect(await svc.listSuppliers(owner)).toHaveLength(1);
  });

  it("forbids front_staff from supplier management (cost/profit sensitive)", async () => {
    const svc = service();
    await expect(svc.createSupplier(frontStaff, { name: "x" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(svc.listSuppliers(frontStaff)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows the public listing without any permission and hides non-public suppliers", async () => {
    const svc = service();
    await svc.createSupplier(owner, { name: "Public", publicLevel: "public" });
    await svc.createSupplier(owner, { name: "Private", publicLevel: "private" });
    const list = await svc.listPublicSuppliers();
    expect(list.map((s) => s.name)).toEqual(["Public"]);
  });

  it("validates required name and public level", async () => {
    const svc = service();
    await expect(svc.createSupplier(owner, { name: "  " })).rejects.toMatchObject({ code: "validation" });
  });
});
