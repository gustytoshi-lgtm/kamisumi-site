// 任意の SQL を SUPABASE_DB_URL に対して実行する小道具（検証・fixture投入用）。
// SQL は環境変数 SQL で渡す（argv のエスケープを避けるため）。
//
//   SQL="select 1" node --env-file=.env.local scripts/db-query.mjs
//
// 注意: 破壊的になり得る。開発/使い捨て project でのみ使う。
import pg from "pg";

const dbUrl = process.env.SUPABASE_DB_URL;
const sql = process.env.SQL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL 未設定（--env-file=.env.local を付ける）。");
  process.exit(1);
}
if (!sql) {
  console.error("環境変数 SQL が空です。");
  process.exit(1);
}

const u = new URL(dbUrl);
const client = new pg.Client({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, "") || "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    console.log(`-- command=${r.command} rowCount=${r.rowCount}`);
    if (r.rows && r.rows.length) console.log(JSON.stringify(r.rows, null, 2));
  }
  await client.end();
} catch (e) {
  console.error(`❌ [${e.code ?? "ERR"}] ${e.message}`);
  process.exit(1);
}
