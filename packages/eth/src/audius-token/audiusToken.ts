import { abi } from './abi'

/**
 * The AUDIO ERC-20 token contract.
 * Initial supply of 1 billion tokens (18 decimals).
 * Supports EIP-2612 gasless `permit()` approvals.
 */
export const AudiusToken = {
  abi,
  address: '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998' as const,
  domain: {
    name: 'Audius',
    version: '1'
  } as const,
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ],
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  } as const
}

export type AudiusTokenTypes = typeof AudiusToken.types
