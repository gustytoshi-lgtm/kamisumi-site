// ワンクリック起動（START_KAMISUMI_*.cmd から呼ばれる）。
// 役割に応じた env を設定して next dev を起動し、準備完了後にブラウザを開く。
// 二重起動を避け、PID を .dev-server.pid（git 管理外）へ保存する。
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { startNextDev, waitForReady, openBrowser, portInUse, c } from "./_devutil.mjs";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const role = arg("role", "owner"); // owner|front_staff|inventory_staff|editor|public
const open = arg("open", role === "public" ? "public" : "admin"); // admin|dev-check|public
const port = Number(arg("port", "3000"));
const locale = arg("locale", "ja");
const PID_FILE = join(process.cwd(), ".dev-server.pid");

const targetPath =
  open === "dev-check"
    ? `/${locale}/admin/dev-check`
    : open === "admin"
      ? `/${locale}/admin`
      : `/${locale}`;
const targetUrl = `http://localhost:${port}${targetPath}`;

const env =
  role === "public"
    ? { ADMIN_ENABLED: "false" }
    : { ADMIN_ENABLED: "true", ADMIN_DEV_ROLE: role };

console.log(c.bold("\n=== KAMISUMI 起動 (mock) ==="));
console.log(`  役割(role): ${c.green(role)}`);
console.log(`  表示先     : ${c.green(targetUrl)}`);
console.log(c.gray("  ※ mock モード: データはサーバー停止で消えます。\n"));

if (await portInUse(port)) {
  console.log(c.yellow(`ポート ${port} は既に使用中です。二重起動を避け、ブラウザだけ開きます。`));
  openBrowser(targetUrl);
  process.exit(0);
}

const child = startNextDev({ port, env });
try {
  writeFileSync(PID_FILE, String(child.pid), "utf8");
} catch {
  /* PID 保存失敗は致命的ではない */
}

const cleanup = () => {
  try {
    rmSync(PID_FILE, { force: true });
  } catch {
    /* ignore */
  }
};
child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

console.log(c.gray("開発サーバーを起動中… (準備完了までお待ちください)"));
const ready = await waitForReady(`http://localhost:${port}/${locale}`, { timeoutMs: 90000 });
if (ready) {
  console.log(c.green(`\n準備完了。ブラウザを開きます: ${targetUrl}`));
  console.log(c.gray("このウィンドウを閉じるとサーバーが停止します。停止のみは STOP_KAMISUMI.cmd。\n"));
  openBrowser(targetUrl);
} else {
  console.log(c.red("\n準備確認がタイムアウトしました。上のログを確認してください。"));
}
