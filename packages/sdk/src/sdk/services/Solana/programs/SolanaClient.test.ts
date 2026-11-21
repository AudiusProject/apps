import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  TransactionMessage
} from '@solana/web3.js'
import { describe, it, expect, vi } from 'vitest'

import type { SolanaWalletAdapter } from '../types'

import { SolanaClient } from './SolanaClient'

const feePayer = Keypair.generate().publicKey
const recentBlockhash = Keypair.generate().publicKey.toBase58()

describe('SolanaClient', () => {
  describe('buildTransaction', () => {
    it('rounds a fractional priority fee', async () => {
      const client = new SolanaClient({
        rpcEndpoints: ['http://localhost:8899'],
        solanaWalletAdapter: {} as SolanaWalletAdapter
      })
      vi.spyOn(
        client.connection,
        'getRecentPrioritizationFees'
      ).mockResolvedValue([{ slot: 1, prioritizationFee: 200_001 }])

      const transaction = await client.buildTransaction({
        feePayer,
        recentBlockhash,
        computeLimit: { units: 1000 },
        instructions: [
          SystemProgram.transfer({
            fromPubkey: feePayer,
            toPubkey: Keypair.generate().publicKey,
            lamports: 1
          })
        ]
      })

      const { instructions } = TransactionMessage.decompile(transaction.message)
      const expected = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 300_002
      })
      expect(
        instructions.some((i) => Buffer.from(i.data).equals(expected.data))
      ).toBe(true)
    })
  })
})
