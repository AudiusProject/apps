import { type TypedData } from 'viem'

import { abi } from './abi'

export type AudiusWormholeTypes = typeof AudiusWormhole.types

/**
 * Contract that can be permitted to send tokens through the Wormhole Portal
 * on a user's behalf. Not to be confused with the standard Wormhole contracts,
 * nor to be confused with wAUDIO (the AudiusToken on Solana).
 */
export class AudiusWormhole {
  public static readonly abi = abi

  public static readonly address = '0x6E7a1F7339bbB62b23D44797b63e4258d283E095'

  public static readonly types = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ],
    TransferTokens: [
      { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'recipientChain', type: 'uint16' },
      { name: 'recipient', type: 'bytes32' },
      { name: 'artbiterFee', type: 'uint256' },
      { name: 'nonce', type: 'uint32' },
      { name: 'deadline', type: 'uint256' }
    ]
  } as const satisfies TypedData
}
