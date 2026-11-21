import { useEffect } from 'react'

import { USDC } from '@audius/fixed-decimal'

import { PurchaseMethod } from '~/models/PurchaseContent'

import { useUSDCBalance } from '../api'

type UsePurchaseMethodProps = {
  price: number
  extraAmount: number | undefined
  method: PurchaseMethod
  setMethod: (value: PurchaseMethod) => void
}

export const usePurchaseMethod = ({
  price,
  extraAmount,
  method,
  setMethod
}: UsePurchaseMethodProps) => {
  const { data: balance } = useUSDCBalance()
  const balanceUSDC = USDC(balance ?? 0).value
  const totalPriceInCents = price + (extraAmount ?? 0)
  const isExistingBalanceDisabled =
    USDC(totalPriceInCents / 100).value > balanceUSDC

  useEffect(() => {
    if (balance) {
      if (!isExistingBalanceDisabled && !method) {
        setMethod(PurchaseMethod.BALANCE)
      } else if (
        isExistingBalanceDisabled &&
        method === PurchaseMethod.BALANCE
      ) {
        setMethod(PurchaseMethod.CARD)
      }
    }
  }, [balance, isExistingBalanceDisabled, method, setMethod])

  return { isExistingBalanceDisabled, totalPriceInCents }
}
