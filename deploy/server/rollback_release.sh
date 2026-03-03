#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/opt/blog}"
RELEASES_DIR="${RELEASES_DIR:-${APP_ROOT}/releases}"
CURRENT_LINK="${CURRENT_LINK:-${APP_ROOT}/current}"

SERVICE_NAME="${SERVICE_NAME:-blog-backend}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/categories}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

log() {
  printf '[rollback][%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  rollback_release.sh <git_sha>
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

if [[ $# -ne 1 ]]; then
  usage
  exit 2
fi

SHA="$1"
TARGET_RELEASE_DIR="${RELEASES_DIR}/${SHA}"
PREVIOUS_RELEASE_DIR=""

[[ -d "${TARGET_RELEASE_DIR}" ]] || fail "Target release does not exist: ${TARGET_RELEASE_DIR}"
[[ -f "${TARGET_RELEASE_DIR}/backend/blog-backend.jar" ]] || fail "Target release missing backend jar."
[[ -d "${TARGET_RELEASE_DIR}/frontend/dist" ]] || fail "Target release missing frontend dist."

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_RELEASE_DIR="$(readlink -f "${CURRENT_LINK}")"
elif [[ -e "${CURRENT_LINK}" ]]; then
  fail "${CURRENT_LINK} exists but is not a symlink."
fi

if [[ "${PREVIOUS_RELEASE_DIR}" == "${TARGET_RELEASE_DIR}" ]]; then
  log "Target release is already current: ${TARGET_RELEASE_DIR}"
fi

atomic_switch_link "${TARGET_RELEASE_DIR}" "${CURRENT_LINK}"
log "Switched current symlink to ${TARGET_RELEASE_DIR}"

if ! run_systemctl restart; then
  log "Service restart failed, attempting restore."
  if [[ -n "${PREVIOUS_RELEASE_DIR}" && -d "${PREVIOUS_RELEASE_DIR}" ]]; then
    atomic_switch_link "${PREVIOUS_RELEASE_DIR}" "${CURRENT_LINK}"
    run_systemctl restart || true
  fi
  fail "Failed to restart ${SERVICE_NAME}.service."
fi

if ! wait_for_healthcheck; then
  log "Health check failed after rollback, attempting restore."
  if [[ -n "${PREVIOUS_RELEASE_DIR}" && -d "${PREVIOUS_RELEASE_DIR}" ]]; then
    atomic_switch_link "${PREVIOUS_RELEASE_DIR}" "${CURRENT_LINK}"
    run_systemctl restart || true
  fi
  fail "Rollback target failed health check."
fi

log "Rollback finished successfully to ${TARGET_RELEASE_DIR}"
