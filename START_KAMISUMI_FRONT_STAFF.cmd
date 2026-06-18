@echo off
rem front_staff（接客・注文対応。原価/利益/権限は非表示）で管理画面を開きます（mock モード）。
call "%~dp0_kamisumi_launch.cmd" --role front_staff --open admin
