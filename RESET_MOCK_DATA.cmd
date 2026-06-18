@echo off
rem mock データを初期状態へ戻します（開発用）。実データには影響しません。
rem 先に START_KAMISUMI_*.cmd でサーバーを起動しておいてください。
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。
  pause
  exit /b 1
)
echo.
echo mock（サンプル）データを初期状態へ戻します。
echo これは開発用データのみが対象で、元に戻せません。
echo.
set /p ANS=本当に初期化しますか？ (y/N):
if /i not "%ANS%"=="y" (
  echo 中止しました。
  pause
  exit /b 0
)
node scripts\mock-reset.mjs
echo.
pause
endlocal
