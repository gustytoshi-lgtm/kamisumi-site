// 短時間スモーク確認。別ポート(3100以降)で next dev を起動し、主要ルートを確認して
// 人間に分かりやすい日本語サマリ(✅/⚠️/❌)を出力する。完全な gate は verify:full。
import { spawnSync } from "node:child_process";
import { startNextDev, waitForReady, waitForPortFree, killTree, portInUse, c } from "./_devutil.mjs";

const scope = process.argv[2] ?? "quick";
const BASE_PORT = 3100;
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
    { name: "SNS下書き", path: "/ja/admin/sns-drafts", status: 200 },
    { name: "抹茶ロット", path: "/ja/admin/matcha-lots", status: 200 },
    { name: "陶器個体", path: "/ja/admin/ceramic-units", status: 200 },
    { name: "メディア", path: "/ja/admin/media", status: 200 },
    { name: "業務設定", path: "/ja/admin/settings", status: 200 },
    { name: "仕入先", path: "/ja/admin/suppliers", status: 200 },
    { name: "仕入記録", path: "/ja/admin/purchases", status: 200 },
    { name: "入金", path: "/ja/admin/payments", status: 200 },
    { name: "配送", path: "/ja/admin/shipping", status: 200 },
    { name: "経費", path: "/ja/admin/expenses", status: 200 },
    { name: "利益分析", path: "/ja/admin/profit", status: 200 },
    { name: "会計export", path: "/ja/admin/accounting", status: 200 },
    { name: "操作履歴", path: "/ja/admin/audit-logs", status: 200 },
    { name: "通知ビューア(dev)", path: "/ja/admin/notifications", status: 200 },
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

const BOOTS = {
  public: PUBLIC_BOOT,
  owner: OWNER_BOOT,
  inventory: INVENTORY_BOOT,
};

const SCOPES = {
  public: ["public"],
  admin: ["owner", "inventory"],
  mock: ["owner"],
  quick: ["public", "owner", "inventory"],
};

const singleBootKey = scope.startsWith("boot:") ? scope.slice("boot:".length) : null;
const bootKeys = singleBootKey ? [singleBootKey] : SCOPES[scope];
if (!bootKeys || bootKeys.some((key) => !BOOTS[key])) {
  console.log(c.red(`unknown scope: ${scope} (public|admin|mock|quick)`));
  process.exit(2);
}

if (!singleBootKey && bootKeys.length > 1) {
  console.log(c.bold(`KAMISUMI スモーク確認: ${scope}`));
  let ok = true;
  for (const key of bootKeys) {
    const result = spawnSync(process.execPath, ["scripts/smoke.mjs", `boot:${key}`], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    ok = result.status === 0 && ok;
  }
  console.log("");
  if (ok) {
    console.log(c.green(c.bold("✅ すべて正常です。")));
    process.exit(0);
  }
  console.log(c.red(c.bold("❌ 一部に問題があります。上の ❌ 行を確認してください。")));
  process.exit(1);
}

async function fetchCheck(base, check) {
  const url = `${base}${check.path}`;
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

async function runBoot(boot, index) {
  const port = BASE_PORT + index;
  const base = `http://localhost:${port}`;
  console.log(c.bold(`\n▶ ${boot.label}`));
  if (await portInUse(port)) {
    console.log(c.red(`  ポート ${port} が使用中です。先に確認用サーバーを停止してください。`));
    return false;
  }
  const child = startNextDev({ port, env: boot.env, inherit: false });
  let allOk = true;
  try {
    const ready = await waitForReady(`${base}/ja`, { timeoutMs: 90000 });
    if (!ready) {
      console.log(c.red("  ❌ サーバー起動がタイムアウト"));
      return false;
    }
    for (const check of boot.checks) {
      const r = await fetchCheck(base, check);
      const mark = r.ok ? c.green("✅ 正常") : c.red("❌ エラー");
      console.log(`  ${mark}  ${check.name} ${c.gray(`(${r.detail})`)}`);
      allOk = allOk && r.ok;
    }
  } finally {
    await killTree(child.pid);
    await waitForPortFree(port);
  }
  return allOk;
}

console.log(c.bold(`KAMISUMI スモーク確認: ${scope}`));
let ok = true;
for (let i = 0; i < bootKeys.length; i += 1) {
  ok = (await runBoot(BOOTS[bootKeys[i]], i)) && ok;
}
console.log("");
if (ok) {
  console.log(c.green(c.bold("✅ すべて正常です。")));
  process.exit(0);
} else {
  console.log(c.red(c.bold("❌ 一部に問題があります。上の ❌ 行を確認してください。")));
  process.exit(1);
}
