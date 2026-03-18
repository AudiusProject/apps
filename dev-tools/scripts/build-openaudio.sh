#!/usr/bin/env bash
# Build openaudio/go-openaudio:dev from a local go-openaudio clone.
# Used by audius-compose up so the local stack can use a locally built OAP image.
#
# Set GO_OPENAUDIO_ROOT to the path to your go-openaudio repo, or clone it to
# PROJECT_ROOT/../go-openaudio (sibling of apps repo).
# If the image already exists or no clone is found, this is a no-op.

set -e

PROJECT_ROOT="${PROJECT_ROOT:-}"
if [[ -z "$PROJECT_ROOT" ]]; then
  # Assume we're in dev-tools/scripts/
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

GO_OPENAUDIO_ROOT="${GO_OPENAUDIO_ROOT:-$PROJECT_ROOT/../go-openaudio}"

if [[ ! -d "$GO_OPENAUDIO_ROOT" ]]; then
  echo "go-openaudio clone not found at $GO_OPENAUDIO_ROOT (set GO_OPENAUDIO_ROOT to override). Skipping openaudio dev image build."
  exit 0
fi

if [[ ! -f "$GO_OPENAUDIO_ROOT/Makefile" ]]; then
  echo "GO_OPENAUDIO_ROOT=$GO_OPENAUDIO_ROOT does not look like go-openaudio (no Makefile). Skipping."
  exit 0
fi

# Image already built
if docker image inspect openaudio/go-openaudio:dev &>/dev/null; then
  echo "openaudio/go-openaudio:dev already exists. Skipping build."
  exit 0
fi

echo "Building openaudio/go-openaudio:dev from $GO_OPENAUDIO_ROOT ..."
( cd "$GO_OPENAUDIO_ROOT" && make docker-dev )
echo "openaudio/go-openaudio:dev built successfully."
