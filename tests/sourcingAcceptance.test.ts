import { describe, expect, it } from "vitest";
import {
  evaluateSourcingAcceptance,
  holdExpiresAt,
  isHoldExpired,
} from "@/lib/commerce/sourcingAcceptance";

const baseState = { currentRequests: 0, currentQuantity: 0 };

describe("sourcing acceptance evaluation", () => {
  it("is open with no constraints", () => {
    expect(evaluateSourcingAcceptance({}, baseState)).toEqual({ open: true, reason: "open" });
  });

  it("stops on manual stop and schedule cancellation first", () => {
    expect(evaluateSourcingAcceptance({ manuallyStopped: true }, baseState).reason).toBe(
      "manually_stopped",
    );
    expect(evaluateSourcingAcceptance({ scheduleCancelled: true }, baseState).reason).toBe(
      "schedule_cancelled",
    );
  });

  it("stops after the deadline", () => {
    const result = evaluateSourcingAcceptance(
      { deadline: "2026-01-01T00:00:00Z" },
      { ...baseState, now: new Date("2026-02-01T00:00:00Z") },
    );
    expect(result).toEqual({ open: false, reason: "deadline_passed" });
  });

  it("stops at max requests and max quantity", () => {
    expect(
      evaluateSourcingAcceptance({ maxRequests: 5 }, { ...baseState, currentRequests: 5 }).reason,
    ).toBe("max_requests_reached");
    expect(
      evaluateSourcingAcceptance({ maxQuantity: 10 }, { ...baseState, currentQuantity: 10 }).reason,
    ).toBe("max_quantity_reached");
  });
});

describe("hold expiry (default 48h, deposit exempt)", () => {
  const heldAt = new Date("2026-06-01T00:00:00Z");

  it("computes the default 48h expiry", () => {
    expect(holdExpiresAt(heldAt).toISOString()).toBe("2026-06-03T00:00:00.000Z");
  });

  it("expires after the window", () => {
    expect(isHoldExpired(heldAt, { now: new Date("2026-06-03T01:00:00Z") })).toBe(true);
    expect(isHoldExpired(heldAt, { now: new Date("2026-06-02T00:00:00Z") })).toBe(false);
  });

  it("never expires when a deposit is paid", () => {
    expect(
      isHoldExpired(heldAt, { now: new Date("2030-01-01T00:00:00Z"), depositPaid: true }),
    ).toBe(false);
  });
});
