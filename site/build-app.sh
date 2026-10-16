#!/bin/bash
# Builds the React app (../frontend: log in, register, dashboards, admin) into public/app.
# Run this on your own computer after changing anything in ../frontend, then upload public/app.
# Needs Node.js (only here, never on the web server).
set -e
cd "$(dirname "$0")/../frontend"
[ -d node_modules ] || npm install --legacy-peer-deps
PUBLIC_URL=/app REACT_APP_BACKEND_URL= GENERATE_SOURCEMAP=false CI=false npm run build
rm -rf ../site/public/app
cp -R build ../site/public/app
echo "React app copied to site/public/app"
