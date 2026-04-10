/**
 * Full SDK entry point — includes createSdkWithServices, all services, and
 * heavy dependencies (Solana programs, Ethereum, EntityManager, etc.).
 *
 * Internal consumers (web, mobile, commands) should import from here:
 *   import { createSdkWithServices, SolanaRelay, ... } from '@audius/sdk/full'
 *
 * External / third-party consumers should use the default entry point instead:
 *   import { sdk } from '@audius/sdk'
 */
import { createSdk } from './sdk'

export * from './sdk'

export const sdk = createSdk
