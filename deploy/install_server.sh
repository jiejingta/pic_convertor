#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/pic_convertor
PYTHON_BIN=${PYTHON_BIN:-python3}

apt-get update
apt-get install -y python3 python3-venv python3-pip

mkdir -p "$APP_DIR"
cd "$APP_DIR"

if [ ! -d .venv ]; then
  "$PYTHON_BIN" -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

install -m 644 deploy/pic-convertor.service /etc/systemd/system/pic-convertor.service

systemctl daemon-reload
systemctl enable pic-convertor
systemctl restart pic-convertor
