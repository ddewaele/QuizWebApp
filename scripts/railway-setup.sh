#!/usr/bin/env bash
# Railway one-time project setup for QuizWebApp
#
# Usage:
#   ./scripts/railway-setup.sh
#
# Prerequisites:
#   - Railway CLI installed: npm install -g @railway/cli
#   - Logged in: railway login
#   - Run from the repo root

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────────────

command -v railway &>/dev/null || error "Railway CLI not found. Install with: npm install -g @railway/cli"

if ! railway whoami &>/dev/null; then
  error "Not logged in. Run: railway login"
fi

info "Setting up QuizWebApp on Railway..."
echo ""

# ── Project ──────────────────────────────────────────────────────────────────

info "Step 1 — Create project"
railway init --name "QuizWebApp"
success "Project created"
echo ""

# ── Database ─────────────────────────────────────────────────────────────────

info "Step 2 — Provision PostgreSQL"
railway add --database postgres
success "PostgreSQL provisioned (DATABASE_URL injected automatically)"
echo ""

# ── Environment variables ────────────────────────────────────────────────────

info "Step 3 — Set environment variables"
echo ""

# NODE_ENV
railway variable set NODE_ENV=production --skip-deploys
success "NODE_ENV=production"

# SESSION_SECRET — generate a fresh one
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
railway variable set "SESSION_SECRET=${SESSION_SECRET}" --skip-deploys
success "SESSION_SECRET=<generated>"

# Prompt for values that can't be auto-generated
echo ""
warn "The following values must be provided manually."
echo ""

read -rp "  GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
[ -z "$GOOGLE_CLIENT_ID" ] && error "GOOGLE_CLIENT_ID is required"
railway variable set "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" --skip-deploys
success "GOOGLE_CLIENT_ID set"

read -rsp "  GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
echo ""
[ -z "$GOOGLE_CLIENT_SECRET" ] && error "GOOGLE_CLIENT_SECRET is required"
railway variable set "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" --skip-deploys
success "GOOGLE_CLIENT_SECRET set"

read -rsp "  ANTHROPIC_API_KEY (leave blank to skip): " ANTHROPIC_API_KEY
echo ""
if [ -n "$ANTHROPIC_API_KEY" ]; then
  railway variable set "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" --skip-deploys
  success "ANTHROPIC_API_KEY set"
else
  warn "ANTHROPIC_API_KEY skipped — AI quiz generation will not work until set"
fi

echo ""

# ── Domain ───────────────────────────────────────────────────────────────────

info "Step 4 — Generate Railway domain"
railway domain
echo ""

# Retrieve the generated domain and set CLIENT_URL
DOMAIN=$(railway status --json 2>/dev/null | node -e "
  let d='';
  process.stdin.on('data', c => d+=c);
  process.stdin.on('end', () => {
    try { const s=JSON.parse(d); console.log(s.serviceDetails?.url || ''); }
    catch { console.log(''); }
  });
" 2>/dev/null || true)

if [ -n "$DOMAIN" ]; then
  railway variable set "CLIENT_URL=https://${DOMAIN}" --skip-deploys
  success "CLIENT_URL=https://${DOMAIN}"
else
  warn "Could not auto-detect domain. Set CLIENT_URL manually in the Railway dashboard."
  warn "Format: https://your-app.up.railway.app"
fi

echo ""

# ── Deploy ───────────────────────────────────────────────────────────────────

info "Step 5 — Deploy"
railway up --detach
success "Deployment triggered"

echo ""
echo -e "${BOLD}Done! Next steps:${RESET}"
echo ""
echo "  1. Wait for the build to complete: railway logs"
echo "  2. Open the app:                   railway open"
echo ""
echo "  3. Add your Railway domain to Google Cloud Console:"
echo "     Authorised JavaScript origins:  https://<your-domain>"
echo "     Authorised redirect URIs:       https://<your-domain>/api/auth/google/callback"
echo ""
echo "     Then update CLIENT_URL if not set above:"
echo "     railway variable set CLIENT_URL=https://<your-domain>"
echo ""
