import { UsdcWei } from '@audius/fixed-decimal'
import { describe, test, expect } from 'vitest'

import { getBalanceNeeded, getPurchaseSummaryValues } from './utils'

const USDC_CENT_WEI = BigInt(10000) as UsdcWei

function centsToBigInt(cents: number) {
  return (BigInt(cents) * USDC_CENT_WEI) as UsdcWei
}

const minPurchaseAmountCents = 100

describe('store/purchase-content/utils', () => {
  test.each([
    {
      description: 'no balance, no extra amount, full price due',
      price: 100,
      currentBalance: centsToBigInt(0),
      extraAmount: 0,
      minPurchaseAmountCents,
      expected: { amountDue: 100, existingBalance: 0 }
    },
    {
      description: 'no balance, extra amount, full price due',
      price: 100,
      currentBalance: centsToBigInt(0),
      extraAmount: 100,
      minPurchaseAmountCents,
      expected: { amountDue: 200, existingBalance: 0 }
    },
    {
      description: 'price - balance less than minimum, full price due',
      price: 100,
      currentBalance: centsToBigInt(1),
      extraAmount: 0,
      minPurchaseAmountCents,
      expected: { amountDue: 100, existingBalance: 0 }
    },
    {
      description: 'price - balance less than minimum, full price due',
      price: 100,
      currentBalance: centsToBigInt(99),
      extraAmount: 0,
      minPurchaseAmountCents,
      expected: { amountDue: 100, existingBalance: undefined }
    },
    {
      description:
        'price + extraAmount - balance less than minimum, full price due',
      price: 100,
      currentBalance: centsToBigInt(101),
      extraAmount: 100,
      minPurchaseAmountCents,
      expected: { amountDue: 200, existingBalance: undefined }
    },
    {
      description: 'no extra amount, balance equals price, nothing due',
      price: 100,
      currentBalance: centsToBigInt(100),
      extraAmount: 0,
      minPurchaseAmountCents,
      expected: { amountDue: 0, existingBalance: 100 }
    },
    {
      description: 'no extra amount, balance exceeds price, nothing due',
      price: 100,
      currentBalance: centsToBigInt(101),
      extraAmount: 0,
      minPurchaseAmountCents,
      expected: { amountDue: 0, existingBalance: 100 }
    },
    {
      description: 'with extra amount, balance covers price, nothing due',
      price: 100,
      currentBalance: centsToBigInt(200),
      extraAmount: 100,
      minPurchaseAmountCents,
      expected: { amountDue: 0, existingBalance: 200 }
    },
    {
      description: 'with extra amount, balance exceeds price, nothing due',
      price: 100,
      currentBalance: centsToBigInt(201),
      extraAmount: 100,
      minPurchaseAmountCents,
      expected: { amountDue: 0, existingBalance: 200 }
    },
    {
      description: 'balance covers part of purchase, remainder due',
      price: 200,
      currentBalance: centsToBigInt(50),
      extraAmount: 0,
      minPurchaseAmountCents,
      expected: { amountDue: 150, existingBalance: 50 }
    },
    {
      description:
        'with extraAmount, balance covers part of purchase, remainder due',
      price: 100,
      currentBalance: centsToBigInt(50),
      extraAmount: 100,
      minPurchaseAmountCents,
      expected: { amountDue: 150, existingBalance: 50 }
    }
  ])(
    `getPurchaseSummaryValues: $description`,
    ({
      price,
      currentBalance,
      extraAmount,
      minPurchaseAmountCents,
      expected
    }) => {
      expect(
        getPurchaseSummaryValues({
          price,
          extraAmount,
          currentBalance,
          minPurchaseAmountCents
        })
      ).toEqual(expect.objectContaining(expected))
    }
  )

  test.each([
    {
      description: 'no balance, full price needed',
      amountDue: centsToBigInt(100),
      balance: centsToBigInt(0),
      minPurchaseAmountCents,
      expected: 100
    },
    {
      description: 'balance brings price below minimum, full price needed',
      amountDue: centsToBigInt(100),
      balance: centsToBigInt(1),
      minPurchaseAmountCents,
      expected: 100
    },
    {
      description: 'balance brings price below minimum, full price needed',
      amountDue: centsToBigInt(100),
      balance: centsToBigInt(99),
      minPurchaseAmountCents,
      expected: 100
    },
    {
      description: 'balance equals price, no additional balance needed',
      amountDue: centsToBigInt(100),
      balance: centsToBigInt(100),
      minPurchaseAmountCents,
      expected: 0
    },
    {
      description: 'balance exceeds price, no additional balance needed',
      amountDue: centsToBigInt(100),
      balance: centsToBigInt(101),
      minPurchaseAmountCents,
      expected: 0
    },
    {
      description: 'balance covers part of purchase price, remainder needed',
      amountDue: centsToBigInt(150),
      balance: centsToBigInt(50),
      minPurchaseAmountCents,
      expected: 100
    }
  ])(
    `getBalanceNeeded: $description`,
    ({ amountDue, balance, minPurchaseAmountCents, expected }) => {
      expect(
        Number(
          getBalanceNeeded(amountDue, balance, minPurchaseAmountCents) /
            USDC_CENT_WEI
        )
      ).toBe(expected)
    }
  )
})
