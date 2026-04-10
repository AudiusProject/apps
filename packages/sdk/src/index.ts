/**
 * Default (lightweight) SDK entry point.
 *
 * Exports `createSdk` and generated API types/models without pulling in heavy
 * dependencies like Solana programs, Ethereum, or the EntityManager client.
 *
 * For the full SDK (createSdkWithServices + all services), use:
 *   import { ... } from '@audius/sdk/full'
 */
import { createSdk } from './sdk/createSdk'

export * from './sdk/index.lite'

export const sdk = createSdk
