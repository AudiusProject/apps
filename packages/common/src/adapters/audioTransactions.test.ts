import { describe, expect, it } from 'vitest'

import {
  TransactionMethod,
  TransactionType
} from '~/store/ui/transaction-details/types'

import { audioTransactionFromSdk } from './audioTransactions'

const makeSdkTransaction = (overrides: Record<string, unknown> = {}) =>
  ({
    signature: 'signature',
    transactionType: 'transfer',
    method: 'receive',
    transactionDate: '2026-01-01T00:00:00.000Z',
    change: '100000000',
    balance: '500000000',
    metadata: 'metadata',
    ...overrides
  }) as any

describe('audioTransactionFromSdk', () => {
  it('maps tip transactions', () => {
    const tipTx = audioTransactionFromSdk(
      makeSdkTransaction({
        transactionType: 'tip',
        method: 'send'
      })
    )

    expect(tipTx.transactionType).toBe(TransactionType.TIP)
    expect(tipTx.method).toBe(TransactionMethod.SEND)
  })

  it('throws on unknown transaction type', () => {
    expect(() =>
      audioTransactionFromSdk(
        makeSdkTransaction({
          transactionType: 'unknown_type'
        })
      )
    ).toThrow('Unknown Transaction')
  })
})
