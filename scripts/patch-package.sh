#!/bin/bash
set -e

npx patch-package --error-on-fail
npx patch-package --patch-dir=packages/mobile/patches --error-on-fail 
npx patch-package --patch-dir=packages/web/patches --error-on-fail 
npx patch-package --patch-dir=packages/identity-service/patches --error-on-fail 
