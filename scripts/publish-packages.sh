
#!/bin/bash

set -euo pipefail

echo "Running build, lint, typecheck, and test..."
# Ensure that all public packages are in this list,
# otherwise they won't get built/linted/tested before being published
npx turbo run build lint typecheck test \
    --filter=create-audius-app \
    --filter=@audius/harmony \
    --filter=@audius/sp-actions \
    --filter=@audius/fixed-decimal \
    --filter=@audius/sdk \
    --filter=@audius/spl

echo "Preparing for OIDC trusted publishing..."
# Remove any leftover token-based auth config
rm -f "$HOME/.npmrc" .npmrc || true

# Ensure we don't accidentally use classic tokens
unset NPM_TOKEN || true
unset NODE_AUTH_TOKEN || true

# Enable provenance (required/expected for OIDC trusted publishing)
export NPM_CONFIG_PROVENANCE=true

echo "Publishing packages..."
npx changeset publish
