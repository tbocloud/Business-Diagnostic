#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Run the whole site on your computer:
#    MariaDB in Docker (tables created from db/*.sql on first run, data kept between runs)
#    + PHP's built-in web server for the site and the API.
#
#  Usage:  ./dev/run-local.sh          then open http://localhost:8080
#  Stop:   Ctrl+C  (the database keeps running; `docker stop bhc-local-db` to stop it)
#  Reset:  docker rm -f bhc-local-db && docker volume rm bhc-local-data
#
#  Safe: it sets DB_HOST, so api/config.php (the live database) is never loaded.
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

DB_PORT_LOCAL="${DB_PORT_LOCAL:-3318}"
WEB_PORT="${WEB_PORT:-8080}"
SETUP_TOKEN="${SETUP_TOKEN:-local-setup-code}"

command -v docker >/dev/null || { echo "Docker is needed for the local database."; exit 1; }
command -v php >/dev/null || { echo "PHP 8+ is needed (brew install php)."; exit 1; }

# The database only listens on this computer (127.0.0.1), never on the Wi-Fi network.
# A container created by an older version of this script may still listen on all networks — recreate it.
if docker ps -a --format '{{.Names}}' | grep -qx bhc-local-db \
   && docker port bhc-local-db 3306 2>/dev/null | grep -qv '^127\.0\.0\.1:'; then
  echo "Recreating the local database container so it only listens on 127.0.0.1 (your data is kept)…"
  docker rm -f bhc-local-db >/dev/null
fi

if ! docker ps --format '{{.Names}}' | grep -qx bhc-local-db; then
  if docker ps -a --format '{{.Names}}' | grep -qx bhc-local-db; then
    docker start bhc-local-db >/dev/null
  else
    docker run -d --name bhc-local-db \
      -e MARIADB_ROOT_PASSWORD=local -e MARIADB_DATABASE=biz_diagnostic \
      -p "127.0.0.1:$DB_PORT_LOCAL:3306" -v bhc-local-data:/var/lib/mysql \
      -v "$PWD/db:/docker-entrypoint-initdb.d:ro" mariadb:10.6 >/dev/null
  fi
fi

printf 'Waiting for the local database'
# Over TCP, so we wait for the real server (not the one-off server that runs db/*.sql).
DB_READY_TIMEOUT="${DB_READY_TIMEOUT:-90}"
waited=0
until docker exec bhc-local-db mariadb -h127.0.0.1 -uroot -plocal -e 'SELECT 1 FROM bde_users LIMIT 1' biz_diagnostic >/dev/null 2>&1; do
  if (( waited >= DB_READY_TIMEOUT )); then
    echo >&2
    echo "The local database isn't ready after ${DB_READY_TIMEOUT}s." >&2
    echo "If it's from an older version, reset it:  docker rm -f bhc-local-db && docker volume rm bhc-local-data" >&2
    echo "Details:  docker logs bhc-local-db" >&2
    exit 1
  fi
  printf '.'; sleep 1; waited=$((waited + 1))
done
echo ' ready.'

[ -f index.html ] || (cd web && npm install && npm run deploy)

# Serve the site under the same sub-folder as the live host (web/.env.production → NEXT_PUBLIC_BASE_PATH),
# by pointing a temporary web root's sub-folder at this repository.
BASE_PATH="$(sed -n 's/^NEXT_PUBLIC_BASE_PATH=//p' web/.env.production 2>/dev/null | tr -d '[:space:]' | sed 's#/*$##')"
DOCROOT="$PWD"
if [ -n "$BASE_PATH" ]; then
  DOCROOT="$(mktemp -d "${TMPDIR:-/tmp}/bhc-docroot-XXXXXX")"
  mkdir -p "$DOCROOT$(dirname "$BASE_PATH")"
  ln -s "$PWD" "$DOCROOT$BASE_PATH"
  printf '<meta http-equiv="refresh" content="0; url=%s/">' "$BASE_PATH" > "$DOCROOT/index.html"
fi

echo
echo "  Website:    http://localhost:$WEB_PORT$BASE_PATH/"
echo "  BDE panel:  http://localhost:$WEB_PORT$BASE_PATH/admin/   (first time: setup code \"$SETUP_TOKEN\")"
echo

DB_HOST=127.0.0.1 DB_PORT="$DB_PORT_LOCAL" DB_USER=root DB_PASSWORD=local DB_NAME=biz_diagnostic \
SETUP_TOKEN="$SETUP_TOKEN" PHP_CLI_SERVER_WORKERS=4 \
  exec php -S "localhost:$WEB_PORT" -t "$DOCROOT"
