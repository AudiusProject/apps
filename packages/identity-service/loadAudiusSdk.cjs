'use strict'

/**
 * Load ESM-only @audius/sdk from outside `src/` so ts-node-dev does not transpile
 * this file and rewrite `import()` into `require()` (ERR_REQUIRE_ESM).
 */
function loadAudiusSdk() {
  return import('@audius/sdk')
}

module.exports = { loadAudiusSdk }
