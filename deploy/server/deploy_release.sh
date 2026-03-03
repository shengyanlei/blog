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
