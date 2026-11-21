# 0030. Protocol dashboard

- Status: Accepted
- Date: 2026-11-21

## Context

Staking, governance and service registration logic in `packages/protocol-dashboard`, including proposals hidden on purpose. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `packages/protocol-dashboard/src/components/BarChart/draw.tsx`

- protocol-dashboard BarChart/draw.tsx overrides Chart.elements.Rectangle.prototype.draw globally to give bar charts rounded corners, adapted from a Stack Overflow answer. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/components/BarChart/draw.tsx#L3))

### `packages/protocol-dashboard/src/components/LineChart/LineChart.tsx`

- protocol-dashboard LineChart sets redraw only after the first data change because redraw=true on initial renders makes the chart flicker. ([L327](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/components/LineChart/LineChart.tsx#L327))

### `packages/protocol-dashboard/src/components/RegisterServiceModal/RegisterServiceModal.tsx`

- protocol-dashboard RegisterServiceModal computes available stake as total active stake minus (number of registered services times each service's min stake), and only asks for the shortfall against the new service's min stake. ([L66](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/components/RegisterServiceModal/RegisterServiceModal.tsx#L66))

### `packages/protocol-dashboard/src/components/TransactionStatus/TransactionStatus.tsx`

- TransactionStatus passes period 0 to useTimeRemaining because lockupExpiryBlock already has the lockup duration baked in; adding the period again would double-count. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/components/TransactionStatus/TransactionStatus.tsx#L113))
- protocol-dashboard disables completing an undelegation while the target operator has a pending claim, since the DelegateManager contract rejects undelegation until the claim is processed. ([L220](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/components/TransactionStatus/TransactionStatus.tsx#L220))

### `packages/protocol-dashboard/src/components/UserInfo/AudiusProfileBadges.tsx`

- AudiusProfileBadges inlines the badge tier table instead of importing from @audius/common/store because that import creates a cycle (store/wallet/utils to api barrel to upload modules to store). ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/components/UserInfo/AudiusProfileBadges.tsx#L16))

### `packages/protocol-dashboard/src/hooks/useConnectAudiusProfile.ts`

- useConnectAudiusProfile signs "Connecting Audius user @handle at ts" with the connected Ethereum wallet and posts it to the OAuth popup, which submits the EntityManager association tx before returning the PKCE code. ([L139](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/hooks/useConnectAudiusProfile.ts#L139))

### `packages/protocol-dashboard/src/hooks/useNodeHealth.ts`

- In useNodeHealth, lastSuccessfulCleanup is mediorum's full repair pass over all blobs, while lastSuccessfulRepair only covers blobs where the node is in the top R rendezvous set. ([L190](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/hooks/useNodeHealth.ts#L190))
- For non-file blob stores, useNodeHealth reports used storage from the last full cleanup run, falling back to or overriding with the last repair run when that one counted more data. ([L203](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/hooks/useNodeHealth.ts#L203))

### `packages/protocol-dashboard/src/services/Audius/governance/governance.ts`

- protocol-dashboard Governance.submitProposal always sends callValue 0; proposals that transfer ETH are not supported. ([L246](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/services/Audius/governance/governance.ts#L246))

### `packages/protocol-dashboard/src/services/Audius/setup.ts`

- protocol-dashboard getWalletIsOnEthMainnet re-reads the chain ID after a short delay because some Ethereum providers briefly return null before reporting the real network. ([L56](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/services/Audius/setup.ts#L56))

### `packages/protocol-dashboard/src/store/actions/registerService.ts`

- registerService does not fail when Solana sender creation fails, because eth registration already succeeded and anyone can permissionlessly register the node as a rewards sender later. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/actions/registerService.ts#L68))

### `packages/protocol-dashboard/src/store/cache/analytics/hooks.ts`

- protocol-dashboard getStartTime rounds metric query start times to the hour so repeated requests share cache keys, and optionally clamps to whole days so the oldest day is complete. ([L68](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/analytics/hooks.ts#L68))
- protocol-dashboard's total-staked time series skips sample timestamps between 1658573677000 and 1658884462050, the July 2022 governance takeover window, because stake values then were corrupted. ([L324](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/analytics/hooks.ts#L324))

### `packages/protocol-dashboard/src/store/cache/proposals/hooks.ts`

- protocol-dashboard filters out proposals 82-85 because they were created during the July 2022 governance takeover and should not be shown. ([L55](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L55))
- protocol-dashboard hides proposal 130 because the sla-auditor submitted it with an incorrect slash amount. ([L58](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L58))
- protocol-dashboard hides proposal 131 because the sla-auditor submitted it with an incorrect slash amount. ([L59](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L59))
- fetchAllProposals keeps one in-flight history request per Audius client in a WeakMap because a new block can trigger a refresh before the previous history load finishes. ([L89](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L89))
- fetchAllProposals only reuses cached proposals that are no longer InProgress or Evaluating and have an evaluatedBlock, since Evaluating is a transitional state that must be re-read. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L112))
- fetchAllProposals loads proposal details in batches of 5 newest-first and publishes after each batch, so the RPC provider is not flooded and the list renders before old history loads. ([L136](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L136))
- In fetchAllProposals, proposals that fail to load are left out of the cache on purpose so the next refresh retries them. ([L164](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/proposals/hooks.ts#L164))

### `packages/protocol-dashboard/src/store/cache/rewards/helpers.ts`

- getMintedAmountAtBlock mirrors ClaimsManager.processClaim and computes minted rewards from stake values at the claim's init block, before splitting between operator and delegators. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/rewards/helpers.ts#L33))

### `packages/protocol-dashboard/src/store/cache/rewards/hooks.ts`

- fetchRewards estimates rewards at the current block; passing lastFundedBlock to getRewardForClaimBlock instead would give the pending claim amount. ([L51](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/rewards/hooks.ts#L51))

### `packages/protocol-dashboard/src/store/cache/user/graph/formatter.ts`

- In the protocol dashboard graph user formatter, validBounds must be read via a ServiceProviderClient contract call because The Graph subgraph does not update that value. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/store/cache/user/graph/formatter.ts#L61))

### `packages/protocol-dashboard/src/utils/mobile.ts`

- isMobile in the protocol dashboard treats navigator.platform MacIntel with maxTouchPoints > 1 as mobile because iPadOS 13+ masquerades as a Mac desktop user agent. ([L16](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/src/utils/mobile.ts#L16))

### `packages/protocol-dashboard/vite.config.ts`

- The protocol dashboard vite config redirects bare 'ethers' imports from @web3modal to the package-local ethers v6, because @web3modal/ethers needs v6 while the monorepo root resolves ethers v5. ([L10](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/vite.config.ts#L10))
- The esbuild plugin in the protocol dashboard vite optimizeDeps config applies the same @web3modal ethers v6 redirect for dev builds, since root node_modules has ethers v5. ([L61](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/protocol-dashboard/vite.config.ts#L61))
