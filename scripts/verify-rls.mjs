// 実 Supabase の RLS を anon / owner / front_staff の 3 視点で検証する（dev/使い捨て project 専用）。
//   node --env-file=.env.local scripts/verify-rls.mjs
//
// 実 Auth ユーザーを作成し、anon key でサインインして role 別の可視性を確認する。
// 重要境界: expenses（原価/採算=機微）は owner のみ。anon / front_staff からは 0 行。
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG = "00000000-0000-0000-0000-0000000000a1";
const PASSWORD = "Rls-Contract-Pw-2026!";

if (!url || !anonKey || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY が必要（--env-file=.env.local）。");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function ensureUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (data?.user?.id) return data.user.id;
  if (error && !/already|registered|exists/i.test(error.message)) throw error;
  // 既存ユーザー: ページングして email で探す。
  for (let page = 1; page <= 5; page++) {
    const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = list.users.find((u) => u.email === email);
    if (found) return found.id;
    if (list.users.length < 200) break;
  }
  throw new Error(`user ${email} not found after create`);
}

async function linkRole(userId, role) {
  const p = await admin.from("profiles").upsert({ id: userId, display_name: role }, { onConflict: "id" });
  if (p.error) throw p.error;
  const r = await admin
    .from("user_roles")
    .upsert({ user_id: userId, organization_id: ORG, role }, { onConflict: "user_id,organization_id,role" });
  if (r.error) throw r.error;
}

async function signedClient(email) {
  const c = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return c;
}

async function count(client, table) {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) return { n: null, err: error.message };
  return { n: count ?? 0, err: null };
}

const checks = [];
function assert(label, ok, detail) {
  checks.push({ label, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${label}  ${detail}`);
}

console.log("== RLS 検証 ==");

const ownerId = await ensureUser("owner-rls@contract.test");
await linkRole(ownerId, "owner");
const staffId = await ensureUser("staff-rls@contract.test");
await linkRole(staffId, "front_staff");

const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const owner = await signedClient("owner-rls@contract.test");
const staff = await signedClient("staff-rls@contract.test");

// 機微: expenses（owner のみ）
const anonExp = await count(anon, "expenses");
const staffExp = await count(staff, "expenses");
const ownerExp = await count(owner, "expenses");
assert("anon は expenses を読めない", anonExp.n === 0, `count=${anonExp.n} err=${anonExp.err ?? "-"}`);
assert("front_staff は expenses を読めない（原価遮断）", staffExp.n === 0, `count=${staffExp.n} err=${staffExp.err ?? "-"}`);
assert("owner は expenses を読める", (ownerExp.n ?? 0) > 0, `count=${ownerExp.n} err=${ownerExp.err ?? "-"}`);

// 公開カタログ: products（anon は公開分のみ）
const anonProd = await count(anon, "products");
const ownerProd = await count(owner, "products");
assert("anon は公開 products を読める", (anonProd.n ?? 0) > 0, `count=${anonProd.n} err=${anonProd.err ?? "-"}`);
assert("owner も products を読める", (ownerProd.n ?? 0) > 0, `count=${ownerProd.n} err=${ownerProd.err ?? "-"}`);

const failed = checks.filter((c) => !c.ok);
console.log(`\n結果: ${checks.length - failed.length}/${checks.length} pass`);
process.exit(failed.length === 0 ? 0 : 1);
