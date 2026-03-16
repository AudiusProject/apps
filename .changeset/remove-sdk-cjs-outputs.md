---
'@audius/sdk': major
---

Remove CommonJS build outputs from the SDK. The SDK now only ships ESM (`index.esm.js` and `index.browser.esm.js`). The `main` field in `package.json` now points to the ESM output. Consumers that relied on `require('@audius/sdk')` will need to switch to ESM imports.
