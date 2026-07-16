#!/usr/bin/env bash
# ============================================================
# setup-nginx.sh — Deploy Zuri Mkulima Connect with Nginx + SSL
# ============================================================
# Run as root:  sudo bash setup-nginx.sh
# ============================================================
set -euo pipefail

DOMAIN="trader.ketronics.co.ke"
APP_DIR="/home/ubuntu/projects/deepseek_agent/work/mkulima_connect"
NGINX_CONF="${APP_DIR}/nginx/trader.ketronics.co.ke.conf"
SERVICE_FILE="${APP_DIR}/nginx/zuri-mkulima-connect.service"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Check root ───────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
    err "This script must be run as root (sudo bash setup-nginx.sh)"
fi

echo "============================================"
echo " Zuri Mkulima Connect — Nginx Setup"
echo " Domain: ${DOMAIN}"
echo "============================================"
echo ""

# ── 1. Install packages ─────────────────────────────────────
log "Installing nginx + certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# ── 2. Create log dirs ──────────────────────────────────────
log "Creating log directories..."
mkdir -p /var/log/zuri-mkulima-connect
mkdir -p /var/www/trader.ketronics.co.ke

# ── 3. Deploy nginx config ──────────────────────────────────
log "Deploying nginx config..."
cp "${NGINX_CONF}" "/etc/nginx/sites-available/${DOMAIN}.conf"

# Remove default if present
rm -f /etc/nginx/sites-enabled/default

# Enable our site
ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"

# ── 4. Test nginx config ────────────────────────────────────
log "Testing nginx configuration..."
nginx -t || err "Nginx config test failed!"

# ── 5. Build the app (if not already) ───────────────────────
log "Building Next.js application..."
runuser -u ubuntu -- bash -lc "cd '$APP_DIR' && npm run build"

# ── 6. Install systemd service ──────────────────────────────
log "Installing systemd service..."
cp "${SERVICE_FILE}" /etc/systemd/system/zuri-mkulima-connect.service
systemctl daemon-reload
systemctl enable zuri-mkulima-connect

# ── 7. Start services ───────────────────────────────────────
log "Restarting nginx..."
systemctl restart nginx

log "Starting Zuri Mkulima Connect..."
systemctl restart zuri-mkulima-connect

sleep 3

# ── 8. Check status ─────────────────────────────────────────
echo ""
echo "============================================"
echo " Service Status"
echo "============================================"

if systemctl is-active --quiet nginx; then
    log "Nginx:         ${GREEN}running${NC}"
else
    err "Nginx failed to start!"
fi

if systemctl is-active --quiet zuri-mkulima-connect; then
    log "Next.js App:   ${GREEN}running${NC}"
else
    warn "Next.js App failed to start. Check logs:"
    echo "    journalctl -u zuri-mkulima-connect -n 50"
fi

# ── 9. SSL Certificate ──────────────────────────────────────
echo ""
echo "============================================"
echo " SSL Certificate"
echo "============================================"
echo ""
echo "Run this command to obtain an SSL certificate:"
echo ""
echo "  sudo certbot --nginx -d ${DOMAIN}"
echo ""
echo "For testing (dry-run):"
echo ""
echo "  sudo certbot --nginx -d ${DOMAIN} --dry-run"
echo ""

# ── 10. Test endpoint ───────────────────────────────────────
log "Testing health endpoint..."
sleep 2
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://localhost:3000/api/health" 2>/dev/null || warn "Could not reach health endpoint"

echo ""
echo "============================================"
log "Setup complete!"
echo ""
echo "  Site: http://${DOMAIN} (→ HTTPS after certbot)"
echo "  Logs: journalctl -u zuri-mkulima-connect -f"
echo "  Nginx: /var/log/nginx/${DOMAIN}.error.log"
echo "============================================"
