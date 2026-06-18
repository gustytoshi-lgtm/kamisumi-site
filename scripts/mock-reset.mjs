// mock データを初期 seed へ戻す。起動中サーバーの dev リセット API を呼ぶ
// （in-memory ストアはサーバープロセス内にあるため、別プロセスからは API 経由で操作する）。
import { c } from "./_devutil.mjs";

const port = Number(process.argv[2] ?? 3000);
const url = `http://localhost:${port}/api/dev/reset`;

try {
  const res = await fetch(url, { method: "POST" });
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    console.log(c.green("mock データを初期状態へ戻しました。"));
    if (body && typeof body === "object") console.log(c.gray(JSON.stringify(body)));
  } else if (res.status === 404) {
    console.log(
      c.yellow(
        "リセット API が無効です（本番ビルド、または ADMIN 無効）。\n" +
          "開発用 mock サーバー（START_KAMISUMI_*.cmd / npm run dev:owner）で再実行してください。",
      ),
    );
  } else {
    console.log(c.red(`リセットに失敗しました (HTTP ${res.status})。`));
  }
} catch {
  console.log(
    c.yellow(
      `サーバーに接続できません (${url})。\n` +
        "先にサーバーを起動してください（START_KAMISUMI_OWNER.cmd など）。\n" +
        "※ サーバーを再起動するだけでも mock データは初期化されます。",
    ),
  );
}
