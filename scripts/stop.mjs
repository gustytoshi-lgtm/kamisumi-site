// 安全な停止。.dev-server.pid に記録した PID のみ停止し、無関係なプロセスは触らない。
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { killTree, portInUse, c } from "./_devutil.mjs";

const PID_FILE = join(process.cwd(), ".dev-server.pid");
const port = Number(process.argv[2] ?? 3000);

if (existsSync(PID_FILE)) {
  const pid = Number(readFileSync(PID_FILE, "utf8").trim());
  if (pid) {
    console.log(c.gray(`PID ${pid} を停止します…`));
    await killTree(pid);
  }
  rmSync(PID_FILE, { force: true });
  console.log(c.green("停止しました（PID ファイルを削除）。"));
} else if (await portInUse(port)) {
  console.log(
    c.yellow(
      `ポート ${port} は使用中ですが、PID ファイル(.dev-server.pid)がありません。\n` +
        "このランチャー以外で起動された可能性があります。安全のため自動停止しません。\n" +
        "起動したウィンドウを手動で閉じてください。",
    ),
  );
} else {
  console.log(c.gray("起動中のサーバーは見つかりませんでした。"));
}
