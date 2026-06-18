import { siteConfig } from "@/config/site";
import type { FulfillmentRepository } from "@/repositories/core/fulfillmentRepository";
import type {
  ShipmentRecord,
  ShipmentStatusEvent,
} from "@/repositories/core/fulfillmentModels";
import { CommerceError, type ActorContext, type AuditEntry } from "@/repositories/core/writeModels";
import { kamisumiBorneFreight, type ShipmentStatus } from "@/lib/commerce/shipmentStatus";
import type { CurrencyCode, Money } from "@/types/commerce";

const ORG = siteConfig.organization.id;

export type MockFulfillmentRepository = FulfillmentRepository & {
  reset(): void;
  listAuditLogs(): AuditEntry[];
};

type Store = {
  shipments: Map<string, ShipmentRecord>;
  events: ShipmentStatusEvent[];
  audit: AuditEntry[];
  counter: number;
};

function emptyStore(): Store {
  return { shipments: new Map(), events: [], audit: [], counter: 0 };
}

function money(currency: CurrencyCode | undefined, minor: number | undefined): Money | undefined {
  if (currency === undefined || minor === undefined) return undefined;
  return { currency, amountMinor: minor };
}

function recomputeBurden(record: ShipmentRecord): ShipmentRecord {
  if (record.actualCost && record.chargedCost) {
    return { ...record, kamisumiBears: kamisumiBorneFreight(record.actualCost, record.chargedCost) };
  }
  return { ...record, kamisumiBears: undefined };
}

export function createMockFulfillmentRepository(): MockFulfillmentRepository {
  let store = emptyStore();
  const now = () => new Date().toISOString();
  const id = (prefix: string) => `${prefix}-${++store.counter}`;
  const audit = (ctx: ActorContext, action: string, entityId: string, summary?: string): void => {
    store.audit.push({
      id: `audit-${store.audit.length + 1}`,
      actorId: ctx.userId,
      action,
      entityType: "shipment",
      entityId,
      summary,
      createdAt: now(),
    });
  };

  function requireShipment(shipmentId: string): ShipmentRecord {
    const shipment = store.shipments.get(shipmentId);
    if (!shipment) throw new CommerceError("not_found", `shipment ${shipmentId} not found`);
    return shipment;
  }

  return {
    reset() {
      store = emptyStore();
    },
    listAuditLogs() {
      return store.audit.slice();
    },

    async createShipment(input, ctx) {
      const ts = now();
      const record = recomputeBurden({
        id: id("shipment"),
        organizationId: input.organizationId || ORG,
        orderId: input.orderId,
        carrier: input.carrier,
        method: input.method,
        weightGrams: input.weightGrams,
        sizeNote: input.sizeNote,
        costCurrency: input.costCurrency,
        actualCost: money(input.costCurrency, input.actualCostMinor),
        chargedCost: money(input.costCurrency, input.chargedCostMinor),
        kamisumiBears: undefined,
        trackingNumber: input.trackingNumber,
        status: "preparing",
        damaged: false,
        returned: false,
        reshipped: false,
        createdAt: ts,
        updatedAt: ts,
      });
      store.shipments.set(record.id, record);
      audit(ctx, "create", record.id, input.orderId);
      return record;
    },

    async updateShipment(shipmentId, patch, ctx) {
      const shipment = requireShipment(shipmentId);
      const costCurrency = patch.costCurrency ?? shipment.costCurrency;
      const next = recomputeBurden({
        ...shipment,
        carrier: patch.carrier ?? shipment.carrier,
        method: patch.method ?? shipment.method,
        weightGrams: patch.weightGrams ?? shipment.weightGrams,
        sizeNote: patch.sizeNote ?? shipment.sizeNote,
        costCurrency,
        actualCost:
          patch.actualCostMinor !== undefined
            ? money(costCurrency, patch.actualCostMinor)
            : shipment.actualCost,
        chargedCost:
          patch.chargedCostMinor !== undefined
            ? money(costCurrency, patch.chargedCostMinor)
            : shipment.chargedCost,
        trackingNumber: patch.trackingNumber ?? shipment.trackingNumber,
        shippedOn: patch.shippedOn ?? shipment.shippedOn,
        deliveredOn: patch.deliveredOn ?? shipment.deliveredOn,
        damaged: patch.damaged ?? shipment.damaged,
        returned: patch.returned ?? shipment.returned,
        reshipped: patch.reshipped ?? shipment.reshipped,
        updatedAt: now(),
      });
      store.shipments.set(shipmentId, next);
      audit(ctx, "update", shipmentId);
      return next;
    },

    async changeShipmentStatus(shipmentId, toStatus: ShipmentStatus, ctx, note) {
      const shipment = requireShipment(shipmentId);
      const ts = now();
      const next: ShipmentRecord = {
        ...shipment,
        status: toStatus,
        returned: toStatus === "returned" ? true : shipment.returned,
        reshipped: toStatus === "reshipped" ? true : shipment.reshipped,
        shippedOn: toStatus === "shipped" && !shipment.shippedOn ? ts.slice(0, 10) : shipment.shippedOn,
        deliveredOn:
          toStatus === "delivered" && !shipment.deliveredOn ? ts.slice(0, 10) : shipment.deliveredOn,
        statusUpdatedAt: ts,
        statusUpdatedBy: ctx.userId,
        updatedAt: ts,
      };
      store.shipments.set(shipmentId, next);
      store.events.push({
        id: id("ship-event"),
        shipmentId,
        fromStatus: shipment.status,
        toStatus,
        changedBy: ctx.userId,
        note,
        createdAt: ts,
      });
      audit(ctx, "status_change", shipmentId, `${shipment.status}->${toStatus}`);
      return next;
    },

    async getShipment(shipmentId) {
      return store.shipments.get(shipmentId) ?? null;
    },

    async listShipments(options) {
      const all = [...store.shipments.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return options?.orderId ? all.filter((s) => s.orderId === options.orderId) : all;
    },

    async listShipmentStatusEvents(shipmentId) {
      return store.events.filter((e) => e.shipmentId === shipmentId);
    },
  };
}

export const mockFulfillmentRepository: MockFulfillmentRepository = createMockFulfillmentRepository();
