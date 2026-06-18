import { describe, expect, it } from "vitest";
import {
  canTransitionShipment,
  freightDifference,
  isShipmentStatus,
  isTerminalShipmentStatus,
  kamisumiBorneFreight,
  nextShipmentStatuses,
} from "@/lib/commerce/shipmentStatus";
import type { Money } from "@/types/commerce";

const twd = (amountMinor: number): Money => ({ currency: "TWD", amountMinor });

describe("shipment status machine", () => {
  it("allows forward shipping flow and cancel before shipping", () => {
    expect(canTransitionShipment("preparing", "shipped")).toBe(true);
    expect(canTransitionShipment("preparing", "cancelled")).toBe(true);
    expect(canTransitionShipment("shipped", "delivered")).toBe(true);
    expect(canTransitionShipment("shipped", "returned")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionShipment("preparing", "delivered")).toBe(false);
    expect(canTransitionShipment("cancelled", "shipped")).toBe(false);
    expect(canTransitionShipment("delivered", "shipped")).toBe(false);
    expect(canTransitionShipment("shipped", "shipped")).toBe(false);
  });

  it("supports return then reship", () => {
    expect(canTransitionShipment("returned", "reshipped")).toBe(true);
    expect(canTransitionShipment("reshipped", "delivered")).toBe(true);
  });

  it("marks delivered and cancelled terminal-ish", () => {
    expect(isTerminalShipmentStatus("cancelled")).toBe(true);
    expect(nextShipmentStatuses("cancelled")).toEqual([]);
    expect(isShipmentStatus("reshipped")).toBe(true);
    expect(isShipmentStatus("teleported")).toBe(false);
  });
});

describe("freight difference", () => {
  it("computes actual minus charged (positive = KAMISUMI bears)", () => {
    expect(freightDifference(twd(500), twd(300))).toEqual(twd(200));
    expect(kamisumiBorneFreight(twd(500), twd(300))).toEqual(twd(200));
  });

  it("returns zero KAMISUMI burden when the customer covers it", () => {
    expect(freightDifference(twd(300), twd(500))).toEqual(twd(-200));
    expect(kamisumiBorneFreight(twd(300), twd(500))).toEqual(twd(0));
  });

  it("refuses to combine different currencies", () => {
    expect(() => freightDifference(twd(500), { currency: "JPY", amountMinor: 300 })).toThrow(/currency mismatch/);
  });
});
