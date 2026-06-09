// BedtimeClient assigns `window.audiusSdk` at import time. Provide a minimal
// `window` so the module can load under the node test environment (the hoisted
// jsdom environment is an incompatible version in this monorepo).
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}
