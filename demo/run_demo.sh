#!/usr/bin/env bash
# Local demo of the site with an in-memory database and demo accounts (password demo1234). Not for production.
#   backend (FastAPI)          http://localhost:8001
#   site (Next.js + React app)  http://localhost:3000   <- open this one
# Needs Python 3, Node.js 20+ and Yarn 1.
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv-demo
. .venv-demo/bin/activate
pip install -q -r backend/requirements.txt mongomock-motor
(cd frontend && yarn install --frozen-lockfile)
(cd web && npm ci && npm run build:all)

(cd demo && uvicorn launch:app --port 8001) &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null' EXIT
cd web && API_URL=http://localhost:8001 SITE_URL=http://localhost:3000 npm start
