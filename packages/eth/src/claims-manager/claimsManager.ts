import { abi } from './abi'

/**
 * Manages periodic minting and distribution of AUDIO staking rewards.
 * Controls funding rounds (~weekly), mints new tokens according to the
 * protocol's inflation schedule, and tracks per-round claim amounts.
 */
export const ClaimsManager = {
  abi,
  address: '0x44617F9dCEd9787C3B06a05B35B4C779a2AA1334' as const
}
