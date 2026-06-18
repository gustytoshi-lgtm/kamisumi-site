// 短時間スモーク確認。別ポート(3100)で next dev を起動し、主要ルートを確認して
// 人間に分かりやすい日本語サマリ(✅/⚠️/❌)を出力する。完全な gate は verify:full。
import { startNextDev, waitForReady, killTree, portInUse, sleep, c } from "./_devutil.mjs";

const scope = process.argv[2] ?? "quick";
const PORT = 3100;
const BASE = `http://localhost:${PORT}`;
const SLUG = "kyoto-usucha-midori";

// 各 boot: ラベル + env + チェック配列。チェックは status / contains / notContains。
const ownerEnv = { ADMIN_ENABLED: "true", ADMIN_DEV_ROLE: "owner" };
const invEnv = { ADMIN_ENABLED: "true", ADMIN_DEV_ROLE: "inventory_staff" };
const publicEnv = { ADMIN_ENABLED: "false" };

const PUBLIC_BOOT = {
  label: "公開サイト (ADMIN 無効)",
  env: publicEnv,
  checks: [
    { name: "日本語トップ /ja", path: "/ja", status: 200 },
    { name: "繁体字トップ /zh-tw", path: "/zh-tw", status: 200 },
    { name: "商品一覧 /ja/shop", path: "/ja/shop", status: 200 },
    { name: "商品詳細 /ja/products", path: `/ja/products/${SLUG}`, status: 200 },
    { name: "OG画像 /api/og", path: "/api/og", status: 200 },
    { name: "管理画面は無効(404)", path: "/ja/admin", status: 404 },
  ],
};

const OWNER_BOOT = {
  label: "管理画面 owner",
  env: ownerEnv,
  checks: [
    { name: "管理トップ(ja)", path: "/ja/admin", status: 200 },
    { name: "管理トップ(zh-tw)", path: "/zh-tw/admin", status: 200 },
    { name: "商品(read)", path: "/ja/admin/products", status: 200, contains: "KMS-" },
    { name: "在庫", path: "/ja/admin/inventory", status: 200 },
    { name: "注文", path: "/ja/admin/orders", status: 200 },
    { name: "買付", path: "/ja/admin/sourcing", status: 200 },
    { name: "Journal", path: "/ja/admin/journal", status: 200 },
  ],
};

const INVENTORY_BOOT = {
  label: "管理画面 inventory_staff (権限制限)",
  env: invEnv,
  checks: [
    { name: "在庫は閲覧可", path: "/ja/admin/inventory", status: 200 },
    { name: "商品編集は権限なし表示", path: "/ja/admin/products", status: 200, contains: "権限がありません" },
  ],
};

const SCOPES = {
  public: [PUBLIC_BOOT],
  admin: [OWNER_BOOT, INVENTORY_BOOT],
  mock: [OWNER_BOOT],
  quick: [PUBLIC_BOOT, OWNER_BOOT, INVENTORY_BOOT],
};

const boots = SCOPES[scope];
if (!boots) {
  console.log(c.red(`unknown scope: ${scope} (public|admin|mock|quick)`));
  process.exit(2);
}

async function fetchCheck(check) {
  const url = `${BASE}${check.path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, { redirect: "manual", signal: ctrl.signal });
    const statusOk = check.status ? res.status === check.status : res.status < 400;
    let bodyOk = true;
    if (check.contains || check.notContains) {
      const body = await res.text();
      if (check.contains) bodyOk = bodyOk && body.includes(check.contains);
      if (check.notContains) bodyOk = bodyOk && !body.includes(check.notContains);
    }
    return { ok: statusOk && bodyOk, detail: `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, detail: error.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

async function runBoot(boot) {
  console.log(c.bold(`\n▶ ${boot.label}`));
  if (await portInUse(PORT)) {
    console.log(c.red(`  ポート ${PORT} が使用中です。先に確認用サーバーを停止してください。`));
    return false;
  }
  const child = startNextDev({ port: PORT, env: boot.env, inherit: false });
  let allOk = true;
  try {
    const ready = await waitForReady(`${BASE}/ja`, { timeoutMs: 90000 });
    if (!ready) {
      console.log(c.red("  ❌ サーバー起動がタイムアウト"));
      return false;
    }
    for (const check of boot.checks) {
      const r = await fetchCheck(check);
      const mark = r.ok ? c.green("✅ 正常") : c.red("❌ エラー");
      console.log(`  ${mark}  ${check.name} ${c.gray(`(${r.detail})`)}`);
      allOk = allOk && r.ok;
    }
  } finally {
    await killTree(child.pid);
    await sleep(1500);
  }
  return allOk;
}

console.log(c.bold(`KAMISUMI スモーク確認: ${scope}`));
let ok = true;
for (const boot of boots) {
  ok = (await runBoot(boot)) && ok;
}
console.log("");
if (ok) {
  console.log(c.green(c.bold("✅ すべて正常です。")));
  process.exit(0);
} else {
  console.log(c.red(c.bold("❌ 一部に問題があります。上の ❌ 行を確認してください。")));
  process.exit(1);
}
