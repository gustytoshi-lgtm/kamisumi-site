// 実 Supabase Storage の検証（dev/使い捨て project 専用）。
//   node --env-file=.env.local scripts/verify-storage.mjs
//
// public/private バケットを用意し、アップロード → 公開URL/署名URL → アクセス制御を確認する。
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要（--env-file=.env.local）。");
  process.exit(1);
}
const c = createClient(url, key, { auth: { persistSession: false } });
const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG マジック

const checks = [];
function assert(label, ok, detail = "") {
  checks.push(ok);
  console.log(`${ok ? "✅" : "❌"} ${label}  ${detail}`);
}

async function ensureBucket(name, isPublic) {
  const { error } = await c.storage.createBucket(name, { public: isPublic });
  if (error && !/exist/i.test(error.message)) throw error;
}

console.log("== Supabase Storage 検証 ==");
await ensureBucket("public", true);
await ensureBucket("private", false);

const pubPath = "contract/verify-public.png";
const privPath = "contract/verify-private.png";
const up1 = await c.storage.from("public").upload(pubPath, bytes, { contentType: "image/png", upsert: true });
const up2 = await c.storage.from("private").upload(privPath, bytes, { contentType: "image/png", upsert: true });
assert("public へアップロード", !up1.error, up1.error?.message ?? "");
assert("private へアップロード", !up2.error, up2.error?.message ?? "");

const publicUrl = c.storage.from("public").getPublicUrl(pubPath).data.publicUrl;
const pubRes = await fetch(publicUrl);
assert("public の公開URLは取得可（200）", pubRes.status === 200, `status=${pubRes.status}`);

const signed = await c.storage.from("private").createSignedUrl(privPath, 60);
const signedRes = signed.data ? await fetch(signed.data.signedUrl) : { status: 0 };
assert("private の署名URLは取得可（200）", signedRes.status === 200, `status=${signedRes.status}`);

const privPublicUrl = c.storage.from("private").getPublicUrl(privPath).data.publicUrl;
const leakRes = await fetch(privPublicUrl);
assert("private は公開URLでは取得不可（非200）", leakRes.status !== 200, `status=${leakRes.status}`);

// cleanup
await c.storage.from("public").remove([pubPath]);
await c.storage.from("private").remove([privPath]);

const passed = checks.filter(Boolean).length;
console.log(`\n結果: ${passed}/${checks.length} pass`);
process.exit(passed === checks.length ? 0 : 1);
