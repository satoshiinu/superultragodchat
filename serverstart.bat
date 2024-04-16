rem 初期設定めんどくさいとおもったので作りました

@echo off
cd /d %~dp0

node -v
if not %errorlevel%==0 (
  echo node.jsをインストールしてください
  pause
  exit
)

py --version > nul 2>&1
if not %errorlevel%==0 (
  echo pythonをインストールしてください
  pause
  exit
)

cmd /c npm install ws
cmd /c npm install uuid

start serverhost.py
node script.js
