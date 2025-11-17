
#!/bin/bash

set -e

echo "Running build, lint, typecheck, and test..."
# Ensure that all public packages are in this list,
# otherwise they won't get built/linted/tested before being published
npx turbo run build lint typecheck test \
    --filter=create-audius-app \
    --filter=@audius/sp-actions \
    --filter=@audius/fixed-decimal \
    --filter=@audius/sdk \
    --filter=@audius/spl \

echo "Publishing packages..."
npx changeset publish
