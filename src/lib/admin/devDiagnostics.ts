import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getDataBackend, isSupabaseConfigured } from "@/config/dataBackend";
import { isProductionRuntime } from "@/config/devtools";
import { isAdminEnabled } from "@/config/features";
import { getAdminAuthMode } from "@/lib/admin/auth";
import { getCommerceWriteRepository } from "@/repositories";

/**
 * dev-check 用の診断情報（サーバー専用）。秘密値は出さず、有無/件数/状態のみ返す。
 */
export type StatusLevel = "ok" | "warn" | "unset" | "todo" | "error";

export type DevDiagnostics = {
  nodeEnv: string;
  backend: string;
  authMode: string;
  adminEnabled: boolean;
  supabaseConfigured: boolean;
  envPresence: { name: string; present: boolean }[];
  mockCounts: { products: number; auditLogs: number } | null;
  migrations: string[];
  latestMigration: string;
  commit: string;
  implementedAdmin: string[];
  pendingAdmin: string[];
};

function readCommit(): string {
  try {
    const head = readFileSync(join(process.cwd(), ".git", "HEAD"), "utf8").trim();
    const m = /^ref:\s*(.+)$/.exec(head);
    if (!m) return head.slice(0, 12); // detached
    try {
      return readFileSync(join(process.cwd(), ".git", m[1]), "utf8").trim().slice(0, 12);
    } catch {
      const packed = readFileSync(join(process.cwd(), ".git", "packed-refs"), "utf8");
      const line = packed.split("\n").find((l) => l.endsWith(m[1]));
      return line ? line.slice(0, 12) : "-";
    }
  } catch {
    return "-";
  }
}

function readMigrations(): string[] {
  try {
    return readdirSync(join(process.cwd(), "supabase", "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }
}

export async function getDevDiagnostics(): Promise<DevDiagnostics> {
  const backend = getDataBackend();

  let mockCounts: DevDiagnostics["mockCounts"] = null;
  if (backend === "mock") {
    try {
      const repo = getCommerceWriteRepository();
      const [products, audit] = await Promise.all([
        repo.listManagedProducts(),
        repo.listAuditLogs(),
      ]);
      mockCounts = { products: products.length, auditLogs: audit.length };
    } catch {
      mockCounts = null;
    }
  }

  const migrations = readMigrations();

  return {
    nodeEnv: isProductionRuntime() ? "production" : process.env.NODE_ENV || "development",
    backend,
    authMode: getAdminAuthMode(),
    adminEnabled: isAdminEnabled(),
    supabaseConfigured: isSupabaseConfigured(),
    envPresence: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
      {
        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        present: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    ],
    mockCounts,
    migrations,
    latestMigration: migrations.at(-1) ?? "-",
    commit: readCommit(),
    implementedAdmin: [
      "dashboard",
      "products",
      "inventory",
      "orders",
      "sourcing",
      "journal",
      "settings",
      "suppliers",
      "purchases",
      "payments",
      "shipping",
      "matcha-lots",
      "ceramic-units",
    ],
    pendingAdmin: [
      "expenses",
      "profit",
      "accounting-export",
      "dashboard-metrics",
    ],
  };
}
