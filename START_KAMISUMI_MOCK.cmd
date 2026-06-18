@echo off
rem mock モードで起動し、動作確認ページ(dev-check)を開きます（owner 権限）。
call "%~dp0_kamisumi_launch.cmd" --role owner --open dev-check
