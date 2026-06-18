@echo off
rem 公開サイトのみを開きます（管理画面は無効＝404）。お客様向け表示の確認用。
call "%~dp0_kamisumi_launch.cmd" --role public --open public
