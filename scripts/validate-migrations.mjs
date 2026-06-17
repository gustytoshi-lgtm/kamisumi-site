// Lightweight migration validator (Supabase 接続なしで実行できる静的チェック)。
// 目的: 連番・括弧/クォート/セミコロンのバランス・空ファイルなど明白な破損を検出する。
// 本格的な SQL 検証は実際の Postgres / `supabase db lint` で行う（KNOWN_ISSUES 参照）。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
let errors = 0;
const fail = (msg) => {
  console.error("  ✗", msg);
  errors += 1;
};

let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
} catch {
  console.error(`migrations dir not found: ${dir}`);
  process.exit(1);
}

if (files.length === 0) fail("no .sql migrations found");

let expected = 1;
for (const file of files) {
  const m = /^(\d{4})_/.exec(file);
  if (!m) {
    fail(`bad filename (need NNNN_name.sql): ${file}`);
    continue;
  }
  const num = Number(m[1]);
  if (num !== expected) fail(`non-sequential migration number: ${file} (expected ${String(expected).padStart(4, "0")})`);
  expected = num + 1;

  const sql = readFileSync(join(dir, file), "utf8");
  if (sql.trim().length === 0) fail(`empty migration: ${file}`);

  // 括弧バランス（文字列内は無視）
  const stripped = sql.replace(/'(?:[^']|'')*'/g, "''").replace(/--.*$/gm, "");
  const open = (stripped.match(/\(/g) || []).length;
  const close = (stripped.match(/\)/g) || []).length;
  if (open !== close) fail(`unbalanced parentheses in ${file} ( ${open} vs ) ${close}`);

  // シングルクォートの偶奇（'' エスケープ考慮済み）
  const quotes = (sql.replace(/''/g, "").match(/'/g) || []).length;
  if (quotes % 2 !== 0) fail(`odd number of single quotes in ${file}`);

  // 末尾の行コメント・空行を除いた最後の有効文が ; で終わるか
  const meaningful = sql.replace(/--.*$/gm, "").trimEnd();
  if (!meaningful.endsWith(";")) fail(`missing trailing semicolon in ${file}`);

  console.log(`  ✓ ${file} (${open} parens, ${sql.split("\n").length} lines)`);
}

if (errors > 0) {
  console.error(`\nmigration validation FAILED (${errors} issue(s))`);
  process.exit(1);
}
console.log(`\nmigration validation OK (${files.length} files)`);
