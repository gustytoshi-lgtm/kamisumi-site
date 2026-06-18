@echo off
rem 短時間スモーク確認（公開＋管理画面）。別ポート(3100)で一時的にサーバーを起動して確認します。
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。
  pause
  exit /b 1
)
echo 確認を開始します（1〜3分程度。完了後に結果が表示されます）...
echo.
node scripts\smoke.mjs quick
echo.
echo 確認が終了しました。上の ✅ / ❌ を確認してください。
pause
endlocal
