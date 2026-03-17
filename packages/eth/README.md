# `@audius/eth`

Typed ABIs and production addresses for the [Audius Ethereum contracts](../../eth-contracts/). Designed for use with [viem](https://viem.sh/) and fully tree-shakable — import only the contracts you need.

## Installation

```bash
npm install @audius/eth viem
```

## Usage

Each contract export is a plain object with `abi` and `address`:

```ts
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { Staking } from '@audius/eth'

const client = createPublicClient({
  chain: mainnet,
  transport: http()
})

const totalStaked = await client.readContract({
  ...Staking,
  functionName: 'totalStaked'
})
```

### Check pending rewards claim

```ts
import { ClaimsManager } from '@audius/eth'

const isPending = await client.readContract({
  ...ClaimsManager,
  functionName: 'claimPending',
  args: ['0xYourServiceProviderAddress']
})
```

### Read a governance proposal

```ts
import { Governance } from '@audius/eth'

const proposal = await client.readContract({
  ...Governance,
  functionName: 'getProposalById',
  args: [1n]
})
```

### Look up service provider endpoints

```ts
import { ServiceProviderFactory, VALIDATOR_SERVICE_TYPE } from '@audius/eth'

// Get the total number of validators
const total = await client.readContract({
  ...ServiceProviderFactory,
  functionName: 'getTotalServiceTypeProviders',
  args: [VALIDATOR_SERVICE_TYPE]
})

// Get the endpoint info for the first one
const info = await client.readContract({
  ...ServiceProviderFactory,
  functionName: 'getServiceEndpointInfo',
  args: [VALIDATOR_SERVICE_TYPE, 1n]
})
```

### EIP-2612 permit (gasless approval)

`AudiusToken` and `AudiusWormhole` include `domain` and `types` for EIP-712 signing:

```ts
import { AudiusToken } from '@audius/eth'

const signature = await walletClient.signTypedData({
  domain: {
    ...AudiusToken.domain,
    chainId: 1,
    verifyingContract: AudiusToken.address
  },
  types: AudiusToken.types,
  primaryType: 'Permit',
  message: {
    owner: '0x...',
    spender: '0x...',
    value: 1000000000000000000n,
    nonce: 0n,
    deadline: 99999999999n
  }
})
```

## Contracts

| Export                   | Description                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `AudiusToken`            | The AUDIO ERC-20 token. Mintable, pausable, burnable. Supports EIP-2612 `permit()`. |
| `AudiusWormhole`         | Sends AUDIO cross-chain via Wormhole with meta-transaction support.                 |
| `ClaimsManager`          | Periodic minting and distribution of AUDIO staking rewards.                         |
| `DelegateManager`        | Delegation of AUDIO tokens to service providers with lockup periods.                |
| `EthRewardsManager`      | Transfers AUDIO rewards from Ethereum to Solana via Wormhole.                       |
| `Governance`             | On-chain governance: proposals, stake-weighted voting, execution.                   |
| `Registry`               | Central directory mapping contract names to addresses.                              |
| `ServiceProviderFactory` | Registration and staking for discovery nodes and content nodes.                     |
| `ServiceTypeManager`     | Registry of valid service types and their versions.                                 |
| `Staking`                | Core staking contract holding all staked AUDIO with checkpointing.                  |
| `TrustedNotifierManager` | Registry of trusted notifier entities.                                              |
