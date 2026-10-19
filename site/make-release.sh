#!/bin/bash
# Makes the upload package for the web server: releases/eee-site-YYYY-MM-DD.zip
# It holds the site with all its PHP packages (vendor/), so the server needs no Composer and no Node.js.
# Without .env, uploads and databases: those stay on the server. See HOSTING.md.
#
# Run on your computer from the project folder:   bash site/make-release.sh
# For hosting where the web folder is fixed (Combell: /www):  bash site/make-release.sh combell
#   → releases/eee-site-combell-YYYY-MM-DD.zip with two folders: www/ (put its contents in /www) and laravel/.
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
rm -rf public/demo   # demo photos and video: only for the demo on your computer
mkdir -p storage/app/uploads storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache

mkdir -p "$ROOT/releases"
if [ "${1:-}" = "combell" ]; then
  # www/ = the files of public/ (with the Combell index.php); laravel/ = everything else, locked off for visitors.
  cd "$BUILD"
  mkdir combell
  mv site/public combell/www
  cp site/deploy/combell/index.php combell/www/index.php
  # Simpler web-folder rules (shared hosting refuses "Options" in .htaccess); also blocks /www/laravel.
  cp site/deploy/combell/htaccess combell/www/.htaccess
  rm -rf site/deploy
  mv site combell/laravel
  printf '%s\n' '# This folder holds the site code, settings (.env) and uploads. Nobody may open it from the internet.' 'Require all denied' > combell/laravel/.htaccess
  NAME="eee-site-combell-$(date +%Y-%m-%d).zip"
  rm -f "$ROOT/releases/$NAME"
  cd combell && zip -qr "$ROOT/releases/$NAME" www laravel -x 'laravel/.env' 'laravel/storage/logs/*.log'
else
  rm -rf site/deploy
  NAME="eee-site-$(date +%Y-%m-%d).zip"
  rm -f "$ROOT/releases/$NAME"
  cd "$BUILD" && zip -qr "$ROOT/releases/$NAME" site -x 'site/.env' 'site/storage/logs/*.log'
fi
echo "Package ready: releases/$NAME ($(du -h "$ROOT/releases/$NAME" | cut -f1))"
