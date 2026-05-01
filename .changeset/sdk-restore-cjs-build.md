---
"@audius/sdk": minor
---

Restore a CommonJS build alongside the existing ESM output. The SDK now ships dual ESM + CJS via the `package.json#exports` map (with `import`/`require`/`browser`/`react-native`/`types` conditions), so Node consumers using `require('@audius/sdk')` no longer hit ESM/CJS interop edges on transitive CJS deps (e.g. `lodash`, `axios`, `commander`, `file-type`, `tus-js-client`).

Resolved entries:
- Node ESM: `dist/index.esm.js`
- Node CJS: `dist/index.cjs`
- Browser ESM: `dist/index.browser.esm.js`
- Browser CJS: `dist/index.browser.cjs`
- React Native: `dist/index.native.js`
- Types: `dist/index.d.ts`
