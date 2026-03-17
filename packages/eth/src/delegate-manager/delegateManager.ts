import { abi } from './abi'

/**
 * Manages delegation of AUDIO tokens to service providers. Delegators can
 * increase or decrease their delegated stake with lockup periods to prevent
 * anticipatory withdrawal before slashing. Includes per-SP minimum
 * delegation amounts (V2).
 */
export const DelegateManager = {
  abi,
  address: '0x4d7968ebfD390D5E7926Cb3587C39eFf2F9FB225' as const
}
