#!/bin/bash
set -e

npx patch-package --error-on-fail
npx patch-package --patch-dir=packages/mobile/patches --error-on-fail 
npx patch-package --patch-dir=packages/web/patches --error-on-fail 
npx patch-package --patch-dir=packages/identity-service/patches --error-on-fail 
# Packages that npm nests under packages/mobile/node_modules. Web CI caches
# don't include that folder, so skip when it's missing.
if [ -d packages/mobile/node_modules ]; then
  (cd packages/mobile && npx patch-package --patch-dir=workspace-patches --error-on-fail)
fi
