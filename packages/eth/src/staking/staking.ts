import { abi } from './abi'

/**
 * Core staking contract that holds all staked AUDIO tokens. Uses checkpointing
 * to track historical stake balances per account and total staked. Supports
 * stake, unstake, slash, and delegate operations.
 */
export const Staking = {
  abi,
  address: '0xe6D97B2099F142513be7A2a068bE040656Ae4591' as const
}
