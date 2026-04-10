#!/usr/bin/env bash
# deploy.sh — Pull latest code from GitHub and restart the service.
#
# Usage (run as root on the server):
#   bash deploy.sh
#
# Environment overrides (optional):
#   REPO_URL   — GitHub repo URL  (default: https://github.com/jiejingta/pic_convertor.git)
#   APP_DIR    — Install directory (default: /opt/pic_convertor)
#   BRANCH     — Git branch        (default: main)

set -euo pipefail

REPO_URL=${REPO_URL:-https://github.com/jiejingta/pic_convertor.git}
APP_DIR=${APP_DIR:-/opt/pic_convertor}
BRANCH=${BRANCH:-main}
SERVICE=pic-convertor

echo "==> [1/5] Checking dependencies..."
command -v python3 >/dev/null 2>&1 || apt-get install -y python3 python3-venv python3-pip
command -v git     >/dev/null 2>&1 || apt-get install -y git

echo "==> [2/5] Syncing code from GitHub..."
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> [3/5] Installing / updating Python dependencies..."
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt

echo "==> [4/5] Installing systemd service..."
install -m 644 deploy/pic-convertor.service /etc/systemd/system/pic-convertor.service
systemctl daemon-reload
systemctl enable "$SERVICE"

echo "==> [5/5] Restarting service..."
systemctl restart "$SERVICE"

sleep 2
STATUS=$(systemctl is-active "$SERVICE" || true)
if [ "$STATUS" = "active" ]; then
  echo ""
  echo "  Service is running."
  echo "  URL: http://$(hostname -I | awk '{print $1}'):8000/zh-CN"
else
  echo "  WARNING: service status = $STATUS"
  journalctl -u "$SERVICE" -n 30 --no-pager
  exit 1
fi
