#!/data/data/com.termux/files/usr/bin/bash
set -e
PORT_ARG="${1:-3000}"

# Stop any previous server quietly
npm run stop >/dev/null 2>&1 || true

# Fall back if chosen port is busy (simple test)
BUSY=$(curl -sS "http://localhost:${PORT_ARG}/registry.json" --max-time 1 || true)
if [ -n "$BUSY" ]; then
  echo "Port ${PORT_ARG} busy, switching to $((PORT_ARG+1))"
  PORT_ARG=$((PORT_ARG+1))
fi

echo "Starting dev server on port ${PORT_ARG}…"
PORT="${PORT_ARG}" npm run dev
