#!/usr/bin/env bash
# Pushes every variable from .env.local to Vercel for production, preview, and development.
# Skips PUBLIC_BASE_URL (set after first deploy) and BLOB_READ_WRITE_TOKEN (provisioned by Vercel).
#
# In non-interactive mode the Vercel CLI requires an explicit environment positional, so we
# call `vercel env add KEY <env> --value V --force --yes` once per environment.
# Values are passed via --value (briefly visible on argv) which is acceptable for a one-shot
# local push from a trusted machine.

set -uo pipefail
cd "$(dirname "$0")/.."

SKIP_KEYS=" PUBLIC_BASE_URL BLOB_READ_WRITE_TOKEN "
# preview env intentionally skipped (CLI requires git branch in non-interactive mode)
ENVS=(production development)

push_one() {
  local key="$1" value="$2" envname="$3"
  # </dev/null on every vercel call so they don't drain the outer `while read < .env.local` stream
  vercel env rm "$key" "$envname" --yes </dev/null >/dev/null 2>&1 || true
  if vercel env add "$key" "$envname" --value "$value" --force --yes </dev/null >/dev/null 2>&1; then
    printf '  OK   %s @ %s\n' "$key" "$envname"
    return 0
  else
    printf '  FAIL %s @ %s\n' "$key" "$envname"
    return 1
  fi
}

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "${line// }" ]] && continue
  case "$line" in \#*) continue ;; esac
  key="${line%%=*}"
  value="${line#*=}"
  # Strip surrounding quotes (dotenv convention). Without this, quoted values
  # in .env.local get pushed to Vercel with literal quotes, breaking anything
  # that parses URLs (e.g. ERR_INVALID_URL on Prisma DATABASE_URL).
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  [[ -z "$value" ]] && continue
  case "$SKIP_KEYS" in *" $key "*) continue ;; esac

  echo "→ $key"
  for envname in "${ENVS[@]}"; do
    push_one "$key" "$value" "$envname" || true
  done
done < .env.local

echo "done."
