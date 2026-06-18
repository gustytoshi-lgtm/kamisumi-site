// 開発用ユーティリティ（launch / stop / smoke 共通）。Windows / OneDrive 環境を考慮。
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { platform } from "node:os";

export const IS_WIN = platform() === "win32";

/** ポートが LISTEN 中か（= サーバー起動中か）を TCP 接続で確認。 */
export function portInUse(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** `next dev` を子プロセスとして起動。stdio は継承（ログを見せる）。
 *  shell:true + 単一コマンド文字列で起動（port は数値のみ・インジェクション無し）。 */
export function startNextDev({ port, env, inherit = true }) {
  const command = `npx --no-install next dev -p ${Number(port)}`;
  const child = spawn(command, {
    env: { ...process.env, ...env },
    stdio: inherit ? "inherit" : "pipe",
    shell: true,
  });
  return child;
}

/** サーバーが応答するまで待つ（最大 timeoutMs）。 */
export async function waitForReady(url, { timeoutMs = 60000, intervalMs = 800 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return true;
    } catch {
      // not ready yet
    }
    await sleep(intervalMs);
  }
  return false;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** OS 標準のブラウザで URL を開く。 */
export function openBrowser(url) {
  if (IS_WIN) {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
  } else if (platform() === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  } else {
    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  }
}

/** プロセスツリーを安全に停止（Windows は taskkill /T、無関係プロセスは触らない）。 */
export function killTree(pid) {
  return new Promise((resolve) => {
    if (!pid) return resolve(false);
    if (IS_WIN) {
      const k = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      k.on("exit", () => resolve(true));
      k.on("error", () => resolve(false));
    } else {
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          /* already gone */
        }
      }
      resolve(true);
    }
  });
}

/** 軽い色付け（端末向け）。 */
export const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
