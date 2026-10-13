#!/usr/bin/env bash
# Local demo of the site, with an in-memory database and demo accounts (password demo1234). Not for production.
#
#   On a Mac: double-click "Start demo.command" in the project folder.
#   Elsewhere: run  bash demo/run_demo.sh
#
# The first start downloads what it needs into .demo-tools/ (Python via uv, and Node.js when it isn't
# installed or is older than 20) and builds the site. That takes a few minutes; later starts are quick.
# Nothing is installed outside the project folder.
#
#   backend (FastAPI)           http://localhost:8001
#   site (Next.js + React app)  http://localhost:3000   <- opens in your browser
#
# Close the window (or press Ctrl+C) to stop the demo.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
TOOLS="$ROOT/.demo-tools"
mkdir -p "$TOOLS"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*"; exit 1; }

case "$(uname -s)" in Darwin) OS=darwin ;; Linux) OS=linux ;; *) fail "This demo script runs on macOS or Linux." ;; esac
case "$(uname -m)" in arm64|aarch64) ARCH=arm64 ;; x86_64) ARCH=x64 ;; *) fail "Unsupported processor: $(uname -m)" ;; esac

for port in 3000 8001; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    fail "Port $port is already in use. Is the demo already running in another window? Close it and try again."
  fi
done

# ---------- Python (through uv) ----------
UV="$(command -v uv || true)"
[ -z "$UV" ] && [ -x "$TOOLS/uv/uv" ] && UV="$TOOLS/uv/uv"
[ -z "$UV" ] && [ -x "$TOOLS/uv/bin/uv" ] && UV="$TOOLS/uv/bin/uv"
if [ -z "$UV" ]; then
  say "Downloading uv (gets Python for the backend)..."
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$TOOLS/uv" UV_NO_MODIFY_PATH=1 sh >/dev/null
  if [ -x "$TOOLS/uv/uv" ]; then UV="$TOOLS/uv/uv"; else UV="$TOOLS/uv/bin/uv"; fi
fi
if [ ! -x ".venv-demo/bin/python" ]; then
  say "Setting up Python for the backend..."
  "$UV" venv -q --python 3.12 .venv-demo
fi
"$UV" pip install -q --python .venv-demo/bin/python -r demo/requirements-demo.txt

# ---------- Node.js ----------
NODE_VERSION=v22.22.0
node_ok() { command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]; }
if [ -x "$TOOLS/node/bin/node" ]; then
  export PATH="$TOOLS/node/bin:$PATH"
elif ! node_ok; then
  say "Downloading Node.js ${NODE_VERSION}..."
  curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-$OS-$ARCH.tar.gz" | tar -xz -C "$TOOLS"
  mv "$TOOLS/node-${NODE_VERSION}-$OS-$ARCH" "$TOOLS/node"
  export PATH="$TOOLS/node/bin:$PATH"
fi

# ---------- build (only when the code changed since the last build) ----------
STAMP="$TOOLS/built-version"
VERSION="$(git rev-parse HEAD 2>/dev/null || date +%s)"
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$VERSION" ] || [ ! -d web/.next ] || [ ! -f web/public/app/index.html ]; then
  say "Installing the site's packages and building it (a few minutes the first time)..."
  (cd frontend && npx --yes yarn@1.22.22 install --frozen-lockfile --silent --network-timeout 600000)
  (cd web && npm ci --no-audit --no-fund --loglevel=error && API_URL=http://localhost:8001 SITE_URL=http://localhost:3000 npm run build:all)
  echo "$VERSION" > "$STAMP"
fi

# ---------- start ----------
say "Starting the backend..."
(cd demo && exec ../.venv-demo/bin/uvicorn launch:app --port 8001 --log-level warning) &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT INT TERM
for i in $(seq 1 60); do
  curl -sf -o /dev/null http://localhost:8001/api/providers && break
  kill -0 "$BACKEND_PID" 2>/dev/null || fail "The backend stopped. See the messages above."
  sleep 1
done

say "Demo running at http://localhost:3000 (all passwords: demo1234). Keep this window open; close it to stop."
( for i in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3000/ && break; sleep 1; done
  if [ "$OS" = darwin ]; then open http://localhost:3000; elif command -v xdg-open >/dev/null; then xdg-open http://localhost:3000 >/dev/null 2>&1; fi ) &
cd web
API_URL=http://localhost:8001 SITE_URL=http://localhost:3000 npm start
