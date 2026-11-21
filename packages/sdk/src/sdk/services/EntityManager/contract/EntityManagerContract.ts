import type { TypedData } from 'viem'

import { abi } from './abi'

export type EntityManagerTypes = typeof EntityManager.types

export class EntityManager {
  public static readonly abi = abi

  public static readonly types = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ],
    ManageEntity: [
      { name: 'userId', type: 'uint' }, // TODO: Update to uint32
      { name: 'entityType', type: 'string' },
      { name: 'entityId', type: 'uint' }, // TODO: Update to uint32
      { name: 'action', type: 'string' },
      { name: 'metadata', type: 'string' },
      { name: 'nonce', type: 'bytes32' }
    ]
  } as const satisfies TypedData
}
