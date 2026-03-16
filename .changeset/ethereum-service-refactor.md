---
'@audius/sdk': major
---

Consolidate Ethereum contract services into a single `EthereumService`

The individual Ethereum contract client classes (`GovernanceClient`,
`ClaimsManagerClient`, `ServiceProviderFactoryClient`,
`EthRewardsManagerClient`, `ServiceTypeManagerClient`,
`TrustedNotifierManagerClient`, `StakingClient`, `DelegateManagerClient`,
`AudiusTokenClient`, `AudiusWormholeClient`, `RegistryClient`) have been
removed from the SDK's `ServicesContainer`. They are replaced by a single
`EthereumService` instance exposed at `sdk.services.ethereum`, which wraps
each contract as a typed viem contract instance.

**Before:**
```ts
await sdk.services.governanceClient.getVotingPeriod()
await sdk.services.claimsManagerClient.getPendingClaim(wallet)
```

**After:**
```ts
await sdk.services.ethereum.governance.read.getVotingPeriod([])
await sdk.services.ethereum.claimsManager.read.getPendingClaim([wallet])
```

Contract instances expose the full viem contract interface (`.read.*`,
`.simulate.*`, `.write.*`, `.watchEvent.*`). ABIs and addresses are sourced
from `@audius/eth` with optional per-environment overrides via
`EthereumServiceConfig`.
