import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  canTransitionOrder,
  isTerminalOrderStatus,
  nextOrderStatuses,
} from "@/lib/commerce/orderStatus";
import {
  INVENTORY_STATUSES,
  canTransitionInventory,
  isPubliclyCountable,
} from "@/lib/commerce/inventoryStatus";

describe("order status machine", () => {
  it("allows the documented forward path", () => {
    expect(canTransitionOrder("inquiry_received", "quote_preparing")).toBe(true);
    expect(canTransitionOrder("paid_in_full", "packing")).toBe(true);
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
  });

  it("forbids skipping and self-transition", () => {
    expect(canTransitionOrder("inquiry_received", "shipped")).toBe(false);
    expect(canTransitionOrder("packing", "packing")).toBe(false);
  });

  it("allows cancellation before shipping but not after", () => {
    expect(canTransitionOrder("deposit_paid", "cancelled")).toBe(true);
    expect(canTransitionOrder("shipped", "cancelled")).toBe(false);
  });

  it("allows refund only from paid/cancelled states", () => {
    expect(canTransitionOrder("deposit_paid", "refunded")).toBe(true);
    expect(canTransitionOrder("cancelled", "refunded")).toBe(true);
    expect(canTransitionOrder("inquiry_received", "refunded")).toBe(false);
  });

  it("marks terminal states with no outgoing transitions", () => {
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(isTerminalOrderStatus("refunded")).toBe(true);
    expect(nextOrderStatuses("completed")).toEqual([]);
    expect(nextOrderStatuses("refunded")).toEqual([]);
  });

  it("covers all 20 documented statuses", () => {
    expect(ORDER_STATUSES.length).toBe(20);
  });
});

describe("inventory status machine", () => {
  it("flows from arrival through inspection to available", () => {
    expect(canTransitionInventory("awaiting_arrival", "inspection_pending")).toBe(true);
    expect(canTransitionInventory("inspection_pending", "available")).toBe(true);
  });

  it("reserves and releases", () => {
    expect(canTransitionInventory("available", "reserved")).toBe(true);
    expect(canTransitionInventory("reserved", "available")).toBe(true);
  });

  it("only counts available stock publicly", () => {
    expect(isPubliclyCountable("available")).toBe(true);
    for (const status of INVENTORY_STATUSES.filter((s) => s !== "available")) {
      expect(isPubliclyCountable(status)).toBe(false);
    }
  });

  it("covers all 8 documented statuses", () => {
    expect(INVENTORY_STATUSES.length).toBe(8);
  });
});
