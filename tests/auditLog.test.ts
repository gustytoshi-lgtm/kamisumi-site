import { describe, expect, it } from "vitest";
import {
  auditEntriesToCsv,
  auditFilterFacets,
  filterAuditEntries,
  hasActiveAuditFilter,
  sortAuditEntriesDesc,
} from "@/lib/commerce/auditLog";
import type { AuditEntry } from "@/repositories/core/writeModels";

function entry(partial: Partial<AuditEntry>): AuditEntry {
  return {
    id: partial.id ?? "audit-1",
    actorId: partial.actorId ?? "owner-1",
    action: partial.action ?? "create",
    entityType: partial.entityType ?? "product",
    entityId: partial.entityId ?? "prod-1",
    summary: partial.summary,
    createdAt: partial.createdAt ?? "2026-06-20T10:00:00.000Z",
  };
}

const sample: AuditEntry[] = [
  entry({ id: "a", action: "create", entityType: "product", actorId: "owner-1", createdAt: "2026-06-18T09:00:00.000Z", summary: "MATCHA-01" }),
  entry({ id: "b", action: "status_change", entityType: "order", actorId: "front-1", createdAt: "2026-06-19T11:30:00.000Z", summary: "paid->shipped" }),
  entry({ id: "c", action: "receipt", entityType: "payment", actorId: "owner-1", createdAt: "2026-06-20T08:15:00.000Z", entityId: "pay-9" }),
  entry({ id: "d", action: "create", entityType: "shipment", actorId: "owner-1", createdAt: "2026-06-20T20:45:00.000Z" }),
];

describe("audit log filtering", () => {
  it("returns everything when filter is empty", () => {
    expect(filterAuditEntries(sample, {})).toHaveLength(4);
  });

  it("filters by exact actor", () => {
    const result = filterAuditEntries(sample, { actor: "owner-1" });
    expect(result.map((e) => e.id)).toEqual(["a", "c", "d"]);
  });

  it("filters by exact action and entityType", () => {
    expect(filterAuditEntries(sample, { action: "create" }).map((e) => e.id)).toEqual(["a", "d"]);
    expect(filterAuditEntries(sample, { entityType: "payment" }).map((e) => e.id)).toEqual(["c"]);
  });

  it("filters by free-text query across fields (case-insensitive)", () => {
    expect(filterAuditEntries(sample, { query: "shipped" }).map((e) => e.id)).toEqual(["b"]);
    expect(filterAuditEntries(sample, { query: "PAY-9" }).map((e) => e.id)).toEqual(["c"]);
    expect(filterAuditEntries(sample, { query: "shipment" }).map((e) => e.id)).toEqual(["d"]);
  });

  it("filters by inclusive date range on the day portion", () => {
    const result = filterAuditEntries(sample, { from: "2026-06-19", to: "2026-06-20" });
    expect(result.map((e) => e.id)).toEqual(["b", "c", "d"]);
  });

  it("includes both range endpoints regardless of time-of-day", () => {
    expect(filterAuditEntries(sample, { from: "2026-06-20", to: "2026-06-20" }).map((e) => e.id)).toEqual(["c", "d"]);
  });

  it("combines multiple criteria with AND", () => {
    const result = filterAuditEntries(sample, { actor: "owner-1", from: "2026-06-20" });
    expect(result.map((e) => e.id)).toEqual(["c", "d"]);
  });

  it("treats blank/whitespace criteria as unset", () => {
    expect(filterAuditEntries(sample, { actor: "  ", query: "" })).toHaveLength(4);
  });

  it("does not mutate the input array", () => {
    const copy = [...sample];
    filterAuditEntries(sample, { actor: "owner-1" });
    expect(sample).toEqual(copy);
  });
});

describe("audit log facets", () => {
  it("returns sorted distinct values", () => {
    expect(auditFilterFacets(sample)).toEqual({
      actors: ["front-1", "owner-1"],
      actions: ["create", "receipt", "status_change"],
      entityTypes: ["order", "payment", "product", "shipment"],
    });
  });
});

describe("audit log sorting", () => {
  it("sorts by createdAt descending, stable for ties", () => {
    const tie: AuditEntry[] = [
      entry({ id: "x1", createdAt: "2026-06-20T10:00:00.000Z" }),
      entry({ id: "x2", createdAt: "2026-06-20T10:00:00.000Z" }),
      entry({ id: "older", createdAt: "2026-06-01T10:00:00.000Z" }),
    ];
    expect(sortAuditEntriesDesc(tie).map((e) => e.id)).toEqual(["x1", "x2", "older"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...sample];
    sortAuditEntriesDesc(sample);
    expect(sample).toEqual(copy);
  });
});

describe("auditEntriesToCsv", () => {
  it("emits a header and one CRLF-separated row per entry", () => {
    const csv = auditEntriesToCsv([
      entry({ id: "a", actorId: "owner-1", action: "create", entityType: "product", entityId: "p1", summary: "MATCHA" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"createdAt","actorId","action","entityType","entityId","summary"');
    expect(lines[1]).toBe('"2026-06-20T10:00:00.000Z","owner-1","create","product","p1","MATCHA"');
  });

  it("escapes quotes/commas/newlines per RFC4180", () => {
    const csv = auditEntriesToCsv([
      entry({ id: "x", summary: 'has "quote", comma\nand newline', entityId: "e1" }),
    ]);
    expect(csv.split("\r\n")[1]).toContain('"has ""quote"", comma\nand newline"');
  });

  it("renders missing summary as an empty quoted cell", () => {
    const csv = auditEntriesToCsv([entry({ id: "y", summary: undefined })]);
    expect(csv.split("\r\n")[1].endsWith(',""')).toBe(true);
  });
});

describe("hasActiveAuditFilter", () => {
  it("is false for empty or blank-only filters", () => {
    expect(hasActiveAuditFilter({})).toBe(false);
    expect(hasActiveAuditFilter({ actor: "  ", query: "" })).toBe(false);
  });

  it("is true when any criterion is set", () => {
    expect(hasActiveAuditFilter({ action: "create" })).toBe(true);
    expect(hasActiveAuditFilter({ from: "2026-06-20" })).toBe(true);
  });
});
