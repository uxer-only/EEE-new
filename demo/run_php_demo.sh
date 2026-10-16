#!/usr/bin/env bash
# Local demo of the PHP version of the site (folder site/), with demo accounts (password demo1234). Not for production.
#
#   On a Mac: double-click "Start demo.command" in the project folder.
#   Elsewhere: run  bash demo/run_php_demo.sh
#
# The first start downloads what it needs into .demo-tools/ (a stand-alone PHP when PHP 8.3+ isn't
# installed, and Composer) and installs the site's PHP packages. That takes a minute or two;
# later starts are quick. Nothing is installed outside the project folder.
# Every start begins with fresh demo data (a small database file, site/database/demo.sqlite).
#
#   site  http://localhost:3000   <- opens in your browser
#
# Close the window (or press Ctrl+C) to stop the demo.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
TOOLS="$ROOT/.demo-tools"
SITE="$ROOT/site"
PORT="${DEMO_PORT:-3000}"
mkdir -p "$TOOLS"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*"; exit 1; }

case "$(uname -s)" in Darwin) OS=macos ;; Linux) OS=linux ;; *) fail "This demo script runs on macOS or Linux." ;; esac
case "$(uname -m)" in arm64|aarch64) ARCH=aarch64 ;; x86_64) ARCH=x86_64 ;; *) fail "Unsupported processor: $(uname -m)" ;; esac

if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  fail "Port $PORT is already in use. Is the demo already running in another window? Close it and try again."
fi

# ---------- PHP ----------
php_ok() { "$1" -r 'exit(PHP_VERSION_ID >= 80300 && extension_loaded("pdo_sqlite") && extension_loaded("mbstring") && extension_loaded("openssl") ? 0 : 1);' 2>/dev/null; }
PHP=""
if [ -x "$TOOLS/php/php" ] && php_ok "$TOOLS/php/php"; then
  PHP="$TOOLS/php/php"
elif command -v php >/dev/null 2>&1 && php_ok "$(command -v php)"; then
  PHP="$(command -v php)"
else
  say "Downloading PHP (stand-alone, about 30 MB)..."
  BASE="https://dl.static-php.dev/static-php-cli/common"
  # Newest PHP 8.4, else 8.3, built for this computer.
  FILE="$(curl -fsSL "$BASE/" | grep -oE "php-8\.[34]\.[0-9]+-cli-$OS-$ARCH\.tar\.gz" | sort -u | sort -t. -k2,2n -k3,3n | tail -1 || true)"
  [ -n "$FILE" ] || fail "Couldn't find a PHP download at $BASE. Check the internet connection, or install PHP 8.3+ yourself (for example: brew install php)."
  mkdir -p "$TOOLS/php"
  curl -fsSL "$BASE/$FILE" | tar -xz -C "$TOOLS/php"
  chmod +x "$TOOLS/php/php"
  # macOS: allow the downloaded program to run
  [ "$OS" = macos ] && xattr -d com.apple.quarantine "$TOOLS/php/php" 2>/dev/null || true
  php_ok "$TOOLS/php/php" || fail "The downloaded PHP doesn't work on this computer. Install PHP 8.3+ yourself (for example: brew install php)."
  PHP="$TOOLS/php/php"
fi
echo "Using $("$PHP" -r 'echo "PHP ", PHP_VERSION;') ($PHP)"

# ---------- the site's PHP packages (vendor/) ----------
if [ ! -f "$SITE/vendor/autoload.php" ] || [ "$SITE/composer.lock" -nt "$SITE/vendor/autoload.php" ]; then
  if [ ! -f "$TOOLS/composer.phar" ]; then
    say "Downloading Composer (installs the site's PHP packages)..."
    curl -fsSL https://getcomposer.org/download/latest-stable/composer.phar -o "$TOOLS/composer.phar"
  fi
  say "Installing the site's PHP packages (first time only)..."
  (cd "$SITE" && "$PHP" "$TOOLS/composer.phar" install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader)
  touch "$SITE/vendor/autoload.php"
fi

# ---------- settings and demo data ----------
cd "$SITE"
DB="$SITE/database/demo.sqlite"
if [ -f .env ] && grep -q '^APP_ENV=production' .env; then
  fail "site/.env holds production settings. The demo only runs with demo settings (it erases its database)."
fi
KEY="$( [ -f .env ] && grep -E '^APP_KEY=base64:' .env | head -1 | cut -d= -f2- || true)"
cat > .env <<EOF
# Demo settings, written by demo/run_php_demo.sh on every start. Not for the web server (see HOSTING.md).
APP_NAME="Elite Escorts Europe"
APP_ENV=local
APP_KEY=$KEY
APP_DEBUG=true
APP_URL=http://localhost:$PORT
DB_CONNECTION=sqlite
DB_DATABASE=$DB
SESSION_DRIVER=file
CACHE_STORE=file
LOG_CHANNEL=single
EOF
[ -n "$KEY" ] || "$PHP" artisan key:generate --force >/dev/null

say "Filling the demo database..."
rm -f "$DB"; touch "$DB"
"$PHP" artisan migrate --force -q
"$PHP" artisan eee:demo --fresh

# ---------- start ----------
say "Demo running at http://localhost:$PORT (all passwords: demo1234). Keep this window open; close it to stop."
( for i in $(seq 1 30); do curl -sf -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done
  if [ "$OS" = macos ]; then open "http://localhost:$PORT"; elif command -v xdg-open >/dev/null; then xdg-open "http://localhost:$PORT" >/dev/null 2>&1; fi ) &
PHP_CLI_SERVER_WORKERS=4 exec "$PHP" artisan serve --host=127.0.0.1 --port=$PORT --no-reload
