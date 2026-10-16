#!/bin/bash
# Makes the upload package for the web server: releases/eee-site-YYYY-MM-DD.zip
# It holds the site with all its PHP packages (vendor/), so the server needs no Composer and no Node.js.
# Without .env, uploads and databases: those stay on the server. See HOSTING.md.
#
# Run on your computer from the project folder:   bash site/make-release.sh
# Needs PHP 8.3+ (the demo's copy in .demo-tools/ is used when there is one) and git.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
PHP="$(command -v php || true)"
[ -x "$ROOT/.demo-tools/php/php" ] && PHP="$ROOT/.demo-tools/php/php"
[ -n "$PHP" ] || { echo "PHP 8.3+ is needed. Start the demo once (it downloads PHP), then try again."; exit 1; }
COMPOSER="$ROOT/.demo-tools/composer.phar"
if [ ! -f "$COMPOSER" ] && command -v composer >/dev/null 2>&1; then
  COMPOSER="$(command -v composer)"
elif [ ! -f "$COMPOSER" ]; then
  mkdir -p "$ROOT/.demo-tools"
  curl -fsSL https://getcomposer.org/download/latest-stable/composer.phar -o "$COMPOSER"
fi
git diff --quiet HEAD -- site || echo "Note: site/ has changes that are not committed; the package uses the last commit."

BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
git archive HEAD site | tar -x -C "$BUILD"
cd "$BUILD/site"
"$PHP" "$COMPOSER" install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --classmap-authoritative
find vendor -name .git -type d -prune -exec rm -rf {} +   # in case a package came as a git copy
rm -f build-app.sh make-release.sh database/*.sqlite
mkdir -p storage/app/uploads storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache

NAME="eee-site-$(date +%Y-%m-%d).zip"
mkdir -p "$ROOT/releases"
rm -f "$ROOT/releases/$NAME"
cd "$BUILD" && zip -qr "$ROOT/releases/$NAME" site -x 'site/.env' 'site/storage/logs/*.log'
echo "Package ready: releases/$NAME ($(du -h "$ROOT/releases/$NAME" | cut -f1))"
