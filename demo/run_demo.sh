#!/usr/bin/env bash
# Local demo of the redesigned site: backend + built frontend on http://localhost:8001,
# with an in-memory database and demo accounts (password demo1234). Not for production.
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv-demo
. .venv-demo/bin/activate
pip install -q -r backend/requirements.txt mongomock-motor
(cd frontend && yarn install --frozen-lockfile && REACT_APP_BACKEND_URL=http://localhost:8001 yarn build)
cd demo && uvicorn launch:app --port 8001
