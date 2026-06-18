@echo off
rem 共通起動ヘルパー（START_KAMISUMI_*.cmd から呼ばれる）。直接ダブルクリックしないでください。
setlocal
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [エラー] Node.js が見つかりません。
  echo   https://nodejs.org/ から LTS 版をインストールしてから、もう一度実行してください。
  echo このウィンドウは自動で閉じません。
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo 初回セットアップ: 必要な部品をインストールします（npm install / 数分かかる場合があります）...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [エラー] インストールに失敗しました。上のログを確認してください。
    pause
    exit /b 1
  )
)

node scripts\launch.mjs %*
if errorlevel 1 (
  echo.
  echo [エラー] 起動中に問題が発生しました。上のログを確認してください。
  pause
)
endlocal
