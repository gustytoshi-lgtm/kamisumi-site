@echo off
rem 起動中の開発サーバーを安全に停止します（このランチャーで起動したものだけ）。
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。
  pause
  exit /b 1
)
node scripts\stop.mjs
echo.
pause
endlocal
