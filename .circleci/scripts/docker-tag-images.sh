#!/usr/bin/env bash
set -euo pipefail

# ...existing code...
TAG="${1:-}"
SERVICE="${2:-}"
SHA_ARG="${3:-}"

if [[ -z "$TAG" ]]; then
  echo "Usage: $0 <tag> <service> [sha]"
  echo "  tag: prerelease|edge|current|__version__"
  echo "  service: discovery-provider|identity-service|all"
  echo "  sha: optional commit SHA to tag (falls back to CIRCLE_SHA1 or git rev-parse HEAD if not provided)"
  exit 2
fi

# Resolve SHA: prefer explicit arg, then CIRCLE_SHA1 env var.
if [[ -n "${SHA_ARG:-}" ]]; then
  SHA="$SHA_ARG"
elif [[ -n "${CIRCLE_SHA1:-}" ]]; then
  SHA="$CIRCLE_SHA1"
elif git rev-parse --verify HEAD >/dev/null 2>&1; then
  SHA=$(git rev-parse HEAD)
else
  echo "Error: commit SHA not provided. Pass as third argument or set CIRCLE_SHA1 in env." >&2
  exit 3
fi

if [[ "$TAG" = "__version__" ]]; then
  TAG="${exported_version_tag:-}"
  if [[ -z "$TAG" ]]; then
    echo "exported_version_tag must be set when tag=__version__" >&2
    exit 1
  fi
fi

discovery=(
  comms
  discovery-provider
  discovery-provider-notifications
  discovery-provider-openresty
  es-indexer
  relay
  solana-relay
  trending-challenge-rewards
  staking
  crm
  mri
  verified-notifications
  anti-abuse
  archiver
)

identity=(
  identity-service
)

case "$SERVICE" in
  discovery-provider)
    images=( "${discovery[@]}" )
    ;;
  identity-service)
    images=( "${identity[@]}" )
    ;;
  all)
    images=( "${discovery[@]}" "${identity[@]}" )
    ;;
  *)
    echo "Unhandled service: $SERVICE" >&2
    exit 1
    ;;
esac

if ! command -v crane >/dev/null 2>&1; then
  echo "crane not found in PATH. Ensure install-crane step ran and \$HOME/bin is on PATH." >&2
  exit 1
fi

for image in "${images[@]}"; do
  echo "adding tag '$TAG' to image 'audius/${image}:${SHA}'"
  crane copy "audius/${image}:${SHA}" "audius/${image}:${TAG}"
done

exit 0