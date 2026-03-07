#!/usr/bin/env bash
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
PI_HOST="${1:-192.168.2.17}"
PI_USER="${2:-berend}"
INSTALL_DIR="/opt/birdnet-api"
PORT=3080

echo "==> Installing birdnet-api on ${PI_USER}@${PI_HOST}"
echo "    Install dir: ${INSTALL_DIR}"
echo "    Port: ${PORT}"
echo ""

# ─── Copy project files ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Copying files..."
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude .idea \
  --exclude install.sh \
  --exclude CLAUDE.md \
  --exclude README.md \
  "${SCRIPT_DIR}/" \
  "${PI_USER}@${PI_HOST}:/tmp/birdnet-api-staging/"

# ─── Remote setup ────────────────────────────────────────────────────────────
echo "==> Running remote setup..."
ssh -t "${PI_USER}@${PI_HOST}" bash -s "$INSTALL_DIR" "$PORT" << 'REMOTE'
set -euo pipefail

INSTALL_DIR="$1"
PORT="$2"

# ── Node.js ──────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
  echo "==> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    Node $(node -v)"

# ── Install to /opt ──────────────────────────────────────────────────────
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r /tmp/birdnet-api-staging/* "$INSTALL_DIR/"
sudo chown -R "$USER:$USER" "$INSTALL_DIR"
rm -rf /tmp/birdnet-api-staging

cd "$INSTALL_DIR"
npm install --production 2>&1 | tail -1

# ── Auto-detect birds.db ────────────────────────────────────────────────
BIRDS_DB=""
for path in \
  "$HOME/BirdNET-Pi/scripts/birds.db" \
  "/home/pi/BirdNET-Pi/scripts/birds.db" \
  "/home/birdnet/BirdNET-Pi/scripts/birds.db"; do
  if [[ -f "$path" ]]; then
    BIRDS_DB="$path"
    break
  fi
done

if [[ -z "$BIRDS_DB" ]]; then
  echo "!! Could not find birds.db automatically."
  echo "   Set BIRDNET_DB in the systemd service manually."
  BIRDS_DB="/home/pi/BirdNET-Pi/scripts/birds.db"
else
  echo "    Found birds.db at ${BIRDS_DB}"
fi

# ── Systemd service ─────────────────────────────────────────────────────
sudo tee /etc/systemd/system/birdnet-api.service > /dev/null << EOF
[Unit]
Description=BirdNET API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) index.js
Restart=on-failure
RestartSec=5

Environment=PORT=$PORT
Environment=BIRDNET_DB=$BIRDS_DB
Environment=CORS_ORIGIN=*

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable birdnet-api
sudo systemctl restart birdnet-api

echo ""
echo "==> Done! birdnet-api is running on port ${PORT}"
echo "    Test: curl http://localhost:${PORT}/health"
echo "    Logs: journalctl -u birdnet-api -f"
REMOTE

echo ""
echo "==> Installed successfully."
echo "    API: http://${PI_HOST}:${PORT}/api/today"
echo "    To update later, just re-run this script."
