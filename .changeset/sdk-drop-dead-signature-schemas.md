---
'@audius/sdk': patch
---

Remove unused EIP-712 `domains`, `types`, and `generators` exports from the internal `signatureSchemas` module and rename what remains (`getNonce`) to `nonce.ts`. None of the removed definitions were reachable from the public SDK entry point, so this is not a breaking change.
