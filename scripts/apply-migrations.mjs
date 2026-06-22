// 実 Supabase（または任意の Postgres）へ supabase/migrations/*.sql を番号順に適用する。
// supabase CLI / psql が無い環境向け。SUPABASE_DB_URL から接続。
//
//   node --env-file=.env.local scripts/apply-migrations.mjs --check   # 接続確認のみ
//   node --env-file=.env.local scripts/apply-migrations.mjs           # migration 適用
//   node --env-file=.env.local scripts/apply-migrations.mjs --seed    # 適用 + seed.sql
//
// 注意: 破壊的。開発/使い捨て project でのみ実行する。
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const seedFile = join(repoRoot, "supabase", "seed.sql");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const withSeed = args.has("--seed");

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL が未設定です（--env-file=.env.local を付けて実行してください）。");
  process.exit(1);
}

const u = new URL(dbUrl);
const config = {
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, "") || "postgres",
  ssl: { rejectUnauthorized: false },
  // ネットワーク不通(IPv6等)を早めに検知する。
  connectionTimeoutMillis: 15000,
  statement_timeout: 120000,
};

const client = new pg.Client(config);

function fail(label, err) {
  console.error(`\n❌ ${label}: ${err.code ? `[${err.code}] ` : ""}${err.message}`);
  process.exit(1);
}

try {
  console.log(`接続中: ${config.user}@${config.host}:${config.port}/${config.database} (ssl)`);
  await client.connect().catch((e) => fail("接続失敗", e));
  const { rows } = await client.query("select version() as v, current_user as u");
  console.log(`✅ 接続成功: ${rows[0].u} / ${rows[0].v.split(" on ")[0]}`);

  if (checkOnly) {
    console.log("--check のため migration は適用しません。");
    await client.end();
    process.exit(0);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  console.log(`\nmigration ${files.length} 本を適用します:`);
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`  - ${file} ... `);
    try {
      await client.query(sql);
      console.log("OK");
    } catch (e) {
      console.log("FAILED");
      fail(`${file} 適用失敗`, e);
    }
  }
  console.log("✅ 全 migration 適用完了");

  if (withSeed) {
    process.stdout.write("seed.sql 投入 ... ");
    try {
      await client.query(readFileSync(seedFile, "utf8"));
      console.log("OK");
    } catch (e) {
      console.log("FAILED");
      fail("seed 投入失敗", e);
    }
  }

  await client.end();
  console.log("\n完了。");
} catch (e) {
  fail("予期しないエラー", e);
}
