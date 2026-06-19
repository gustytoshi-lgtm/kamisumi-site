import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/**
 * 公開サイト不変の回帰ガード（ルーティング層）。
 * flag OFF 時に gated ルート（admin / account / cart）が真の 404 になり、
 * 公開ルートは 404 にならないことを固定する。
 */

const FLAG_ENV = ["ADMIN_ENABLED", "CUSTOMER_PORTAL_ENABLED", "CART_ENABLED"] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of FLAG_ENV) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of FLAG_ENV) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function request(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`));
}

describe("proxy gating — flags OFF (default)", () => {
  it("returns a true 404 for gated routes", async () => {
    expect((await proxy(request("/ja/admin"))).status).toBe(404);
    expect((await proxy(request("/ja/account"))).status).toBe(404);
    expect((await proxy(request("/ja/cart"))).status).toBe(404);
    expect((await proxy(request("/zh-tw/cart"))).status).toBe(404);
  });

  it("does not 404 public routes", async () => {
    expect((await proxy(request("/ja/shop"))).status).not.toBe(404);
    expect((await proxy(request("/zh-tw/products/kyoto-usucha-midori"))).status).not.toBe(404);
  });

  it("redirects the bare root to the default locale", async () => {
    const res = await proxy(request("/"));
    expect([307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/zh-tw");
  });
});

describe("proxy gating — flags ON", () => {
  it("stops 404ing gated routes once enabled", async () => {
    process.env.ADMIN_ENABLED = "true";
    process.env.CUSTOMER_PORTAL_ENABLED = "true";
    process.env.CART_ENABLED = "true";
    expect((await proxy(request("/ja/cart"))).status).not.toBe(404);
    expect((await proxy(request("/ja/account"))).status).not.toBe(404);
    expect((await proxy(request("/ja/admin"))).status).not.toBe(404);
  });
});
