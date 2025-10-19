#!/bin/sh
# ==============================================
# 🚀 Cosmic-Dashboard Entrypoint — V6.8.5
# Initializes environment and starts the server
# ==============================================

set -e

echo "🌌 Starting Cosmic-Dashboard V6.8.5..."
echo "📦 Node version: $(node -v)"
echo "📦 NPM version:  $(npm -v)"

# Environment summary
echo "🧠 Environment: ${NODE_ENV}"
echo "🔧 Web Port: ${PORT:-3000}"
echo "📁 Working Dir: $(pwd)"

# Create log + plugin dirs if missing
mkdir -p logs plugins telemetry data/logs

# Copy .env if missing (fallback)
if [ ! -f ".env" ]; then
  echo "⚠️  .env not found, copying default..."
  cp docker/.env.example .env || true
fi

# Verify dependencies
echo "🧩 Installing dependencies..."
npm install --omit=dev --no-audit --no-fund

# Start dashboard
echo "🚀 Launching Dashboard..."
exec "$@"