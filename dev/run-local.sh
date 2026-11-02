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

if ! docker ps --format '{{.Names}}' | grep -qx bhc-local-db; then
  if docker ps -a --format '{{.Names}}' | grep -qx bhc-local-db; then
    docker start bhc-local-db >/dev/null
  else
    docker run -d --name bhc-local-db \
      -e MARIADB_ROOT_PASSWORD=local -e MARIADB_DATABASE=biz_diagnostic \
      -p "$DB_PORT_LOCAL:3306" -v bhc-local-data:/var/lib/mysql \
      -v "$PWD/db:/docker-entrypoint-initdb.d:ro" mariadb:10.6 >/dev/null
  fi
fi

printf 'Waiting for the local database'
# Over TCP, so we wait for the real server (not the one-off server that runs db/*.sql).
until docker exec bhc-local-db mariadb -h127.0.0.1 -uroot -plocal -e 'SELECT 1 FROM bde_users LIMIT 1' biz_diagnostic >/dev/null 2>&1; do
  printf '.'; sleep 1
done
echo ' ready.'

[ -f index.html ] || (cd web && npm install && npm run deploy)

echo
echo "  Website:    http://localhost:$WEB_PORT"
echo "  BDE panel:  http://localhost:$WEB_PORT/admin/   (first time: setup code \"$SETUP_TOKEN\")"
echo

DB_HOST=127.0.0.1 DB_PORT="$DB_PORT_LOCAL" DB_USER=root DB_PASSWORD=local DB_NAME=biz_diagnostic \
SETUP_TOKEN="$SETUP_TOKEN" PHP_CLI_SERVER_WORKERS=4 \
  exec php -S "localhost:$WEB_PORT" -t .
