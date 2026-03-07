#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/opt/blog}"
INCOMING_DIR="${INCOMING_DIR:-${APP_ROOT}/incoming}"
RELEASES_DIR="${RELEASES_DIR:-${APP_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${APP_ROOT}/current}"
SHARED_RUNTIME_DIR="${SHARED_RUNTIME_DIR:-${APP_ROOT}/shared/runtime}"

SERVICE_NAME="${SERVICE_NAME:-blog-backend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/categories}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-false}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-/etc/blog/blog-backend.env}"
DB_MIGRATION_SUBDIR="${DB_MIGRATION_SUBDIR:-migrations}"
DB_MIGRATION_TABLE="${DB_MIGRATION_TABLE:-schema_migrations}"

log() {
  printf '[deploy][%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  deploy_release.sh <git_sha>
EOF
}

run_systemctl() {
  local action="$1"
  local unit="${SERVICE_NAME}.service"

  if systemctl "${action}" "${unit}" >/dev/null 2>&1; then
    return 0
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo systemctl "${action}" "${unit}"
    return 0
  fi

  systemctl "${action}" "${unit}"
}

atomic_switch_link() {
  local target="$1"
  local link_path="$2"
  local tmp_link="${link_path}.tmp"

  ln -sfn "${target}" "${tmp_link}"
  mv -Tf "${tmp_link}" "${link_path}"
}

wait_for_healthcheck() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  while ((SECONDS < deadline)); do
    if curl -fsS --max-time 2 "${HEALTH_URL}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${HEALTH_INTERVAL_SECONDS}"
  done
  return 1
}

cleanup_old_releases() {
  local current_target=""
  local idx=0
  local release_dir=""
  local -a release_dirs=()

  current_target="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
  mapfile -t release_dirs < <(find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk '{print $2}')

  for release_dir in "${release_dirs[@]}"; do
    if ((idx < KEEP_RELEASES)); then
      idx=$((idx + 1))
      continue
    fi
    if [[ -n "${current_target}" && "${release_dir}" == "${current_target}" ]]; then
      continue
    fi
    log "Removing old release: ${release_dir}"
    rm -rf "${release_dir}"
  done
}

run_db_migrations() {
  local scripts_dir="$1"
  local provided_jdbc_url="${SPRING_DATASOURCE_URL:-}"
  local provided_db_user="${SPRING_DATASOURCE_USERNAME:-}"
  local provided_db_pass="${SPRING_DATASOURCE_PASSWORD:-}"
  local migration_dir=""
  local jdbc_url=""
  local db_user=""
  local db_pass=""
  local db_host=""
  local db_port=""
  local db_name=""
  local migration_name=""
  local migration_path=""
  local migration_checksum=""
  local recorded_checksum=""
  local escaped_migration_name=""
  local has_pending_migration="false"

  if [[ "${RUN_DB_MIGRATIONS}" != "true" ]]; then
    log "Skipping DB migrations (set RUN_DB_MIGRATIONS=true to enable)."
    return 0
  fi

  [[ -d "${scripts_dir}" ]] || fail "Migration scripts directory not found: ${scripts_dir}"
  migration_dir="${scripts_dir}/${DB_MIGRATION_SUBDIR}"

  if [[ -f "${BACKEND_ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${BACKEND_ENV_FILE}"
  fi

  jdbc_url="${SPRING_DATASOURCE_URL:-$provided_jdbc_url}"
  db_user="${SPRING_DATASOURCE_USERNAME:-$provided_db_user}"
  db_pass="${SPRING_DATASOURCE_PASSWORD:-$provided_db_pass}"

  [[ -n "${jdbc_url}" ]] || fail "SPRING_DATASOURCE_URL is empty; cannot run DB migrations."
  [[ -n "${db_user}" ]] || fail "SPRING_DATASOURCE_USERNAME is empty; cannot run DB migrations."

  if ! command -v mysql >/dev/null 2>&1; then
    fail "mysql CLI is not installed; cannot run DB migrations."
  fi

  if [[ "${jdbc_url}" =~ ^jdbc:mysql://([^/:?]+)(:([0-9]+))?/([^?]+) ]]; then
    db_host="${BASH_REMATCH[1]}"
    db_port="${BASH_REMATCH[3]:-3306}"
    db_name="${BASH_REMATCH[4]}"
  else
    fail "Unsupported SPRING_DATASOURCE_URL format: ${jdbc_url}"
  fi

  mysql_exec() {
    local sql="$1"
    if [[ -n "${db_pass}" ]]; then
      MYSQL_PWD="${db_pass}" mysql \
        --default-character-set=utf8mb4 \
        --batch \
        --skip-column-names \
        --raw \
        --host="${db_host}" \
        --port="${db_port}" \
        --user="${db_user}" \
        "${db_name}" \
        -e "${sql}"
    else
      mysql \
        --default-character-set=utf8mb4 \
        --batch \
        --skip-column-names \
        --raw \
        --host="${db_host}" \
        --port="${db_port}" \
        --user="${db_user}" \
        "${db_name}" \
        -e "${sql}"
    fi
  }

  mysql_apply_file() {
    local sql_file="$1"
    if [[ -n "${db_pass}" ]]; then
      MYSQL_PWD="${db_pass}" mysql \
        --default-character-set=utf8mb4 \
        --host="${db_host}" \
        --port="${db_port}" \
        --user="${db_user}" \
        "${db_name}" < "${sql_file}"
    else
      mysql \
        --default-character-set=utf8mb4 \
        --host="${db_host}" \
        --port="${db_port}" \
        --user="${db_user}" \
        "${db_name}" < "${sql_file}"
    fi
  }

  escape_sql_literal() {
    printf "%s" "$1" | sed "s/'/''/g"
  }

  mysql_exec "
    CREATE TABLE IF NOT EXISTS ${DB_MIGRATION_TABLE} (
      id BIGINT NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_${DB_MIGRATION_TABLE}_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  "

  if [[ ! -d "${migration_dir}" ]]; then
    log "No migration directory found at ${migration_dir}; nothing to apply."
    return 0
  fi

  mapfile -t migration_files < <(find "${migration_dir}" -mindepth 1 -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort)
  if [[ "${#migration_files[@]}" -eq 0 ]]; then
    log "No migration files found in ${migration_dir}; nothing to apply."
    return 0
  fi

  for migration_name in "${migration_files[@]}"; do
    migration_path="${migration_dir}/${migration_name}"
    migration_checksum="$(sha256sum "${migration_path}" | awk '{print $1}')"
    escaped_migration_name="$(escape_sql_literal "${migration_name}")"
    recorded_checksum="$(mysql_exec "SELECT checksum FROM ${DB_MIGRATION_TABLE} WHERE filename = '${escaped_migration_name}' LIMIT 1;")"

    if [[ -n "${recorded_checksum}" ]]; then
      if [[ "${recorded_checksum}" != "${migration_checksum}" ]]; then
        fail "Migration checksum mismatch for ${migration_name}. Do not edit an applied migration; create a new one instead."
      fi
      log "Skipping already applied migration: ${migration_name}"
      continue
    fi

    has_pending_migration="true"
    log "Applying DB migration: ${migration_name}"
    mysql_apply_file "${migration_path}"
    mysql_exec "
      INSERT INTO ${DB_MIGRATION_TABLE} (filename, checksum)
      VALUES ('${escaped_migration_name}', '${migration_checksum}');
    "
  done

  if [[ "${has_pending_migration}" == "true" ]]; then
    log "DB migrations completed."
  else
    log "DB migrations already up to date."
  fi
}

if [[ $# -ne 1 ]]; then
  usage
  exit 2
fi

SHA="$1"
if [[ ! "${SHA}" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  fail "Invalid git sha: ${SHA}"
fi

ARCHIVE_PATH="${INCOMING_DIR}/release-${SHA}.tgz"
NEW_RELEASE_DIR="${RELEASES_DIR}/${SHA}"
PREVIOUS_RELEASE_DIR=""

log "Starting deploy for ${SHA}"

mkdir -p "${INCOMING_DIR}" "${RELEASES_DIR}" "${SHARED_RUNTIME_DIR}" "${SHARED_RUNTIME_DIR}/uploads" "${SHARED_RUNTIME_DIR}/site-config-backups"

[[ -f "${ARCHIVE_PATH}" ]] || fail "Release archive not found: ${ARCHIVE_PATH}"

if [[ -e "${NEW_RELEASE_DIR}" ]]; then
  log "Release directory already exists, removing: ${NEW_RELEASE_DIR}"
  rm -rf "${NEW_RELEASE_DIR}"
fi
mkdir -p "${NEW_RELEASE_DIR}"

tar -xzf "${ARCHIVE_PATH}" -C "${NEW_RELEASE_DIR}"

[[ -f "${NEW_RELEASE_DIR}/backend/blog-backend.jar" ]] || fail "Missing backend jar in release package."
[[ -d "${NEW_RELEASE_DIR}/frontend/dist" ]] || fail "Missing frontend dist in release package."

if [[ ! -f "${SHARED_RUNTIME_DIR}/application.yml" ]]; then
  [[ -f "${NEW_RELEASE_DIR}/frontend/dist/application.yml" ]] || fail "Cannot initialize shared application.yml (source not found)."
  cp "${NEW_RELEASE_DIR}/frontend/dist/application.yml" "${SHARED_RUNTIME_DIR}/application.yml"
  log "Initialized shared runtime application.yml"
fi

run_db_migrations "${NEW_RELEASE_DIR}/backend/scripts"

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_RELEASE_DIR="$(readlink -f "${CURRENT_LINK}")"
  log "Current release before deploy: ${PREVIOUS_RELEASE_DIR}"
elif [[ -e "${CURRENT_LINK}" ]]; then
  fail "${CURRENT_LINK} exists but is not a symlink."
fi

atomic_switch_link "${NEW_RELEASE_DIR}" "${CURRENT_LINK}"
log "Switched current symlink to ${NEW_RELEASE_DIR}"

if ! run_systemctl restart; then
  log "Service restart failed, attempting rollback."
  if [[ -n "${PREVIOUS_RELEASE_DIR}" && -d "${PREVIOUS_RELEASE_DIR}" ]]; then
    atomic_switch_link "${PREVIOUS_RELEASE_DIR}" "${CURRENT_LINK}"
    run_systemctl restart || true
  fi
  fail "Failed to restart ${SERVICE_NAME}.service."
fi

if ! wait_for_healthcheck; then
  log "Health check failed, attempting rollback."
  if [[ -n "${PREVIOUS_RELEASE_DIR}" && -d "${PREVIOUS_RELEASE_DIR}" ]]; then
    atomic_switch_link "${PREVIOUS_RELEASE_DIR}" "${CURRENT_LINK}"
    run_systemctl restart || true
    fail "Deployment rolled back to previous release: ${PREVIOUS_RELEASE_DIR}"
  fi
  fail "Health check failed and no previous release is available for rollback."
fi

cleanup_old_releases
rm -f "${ARCHIVE_PATH}"

log "Deploy finished successfully for ${SHA}"
