---
'@audius/sdk': patch
---

Define the Ethereum mainnet chain in the SDK instead of importing it from `viem/chains`, so bundlers that don't tree-shake CommonJS (like Metro) no longer include viem's full chain list.
