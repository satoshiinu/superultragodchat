rem �����ݒ�߂�ǂ������Ƃ��������̂ō��܂���

@echo off
cd /d %~dp0

node -v
if not %errorlevel%==0 (
  echo node.js���C���X�g�[�����Ă�������
  pause
  exit
)

py --version > nul 2>&1
if not %errorlevel%==0 (
  echo python���C���X�g�[�����Ă�������
  pause
  exit
)

cmd /c npm install ws
cmd /c npm install uuid

start serverhost.py
node script.js
