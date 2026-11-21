import { useMemo } from 'react'

import { IntKeys } from '~/services/remote-config'

import { useRemoteVar } from '../useRemoteVar'

import { USDCPurchaseConfig } from './types'

export const useUSDCPurchaseConfig = (): USDCPurchaseConfig => {
  const minContentPriceCents = useRemoteVar(IntKeys.MIN_CONTENT_PRICE_CENTS)
  const maxContentPriceCents = useRemoteVar(IntKeys.MAX_CONTENT_PRICE_CENTS)
  const minUSDCPurchaseAmountCents = useRemoteVar(
    IntKeys.MIN_USDC_PURCHASE_AMOUNT_CENTS
  )
  const maxUSDCPurchaseAmountCents = useRemoteVar(
    IntKeys.MAX_USDC_PURCHASE_AMOUNT_CENTS
  )

  return useMemo(
    () => ({
      minContentPriceCents,
      maxContentPriceCents,
      minUSDCPurchaseAmountCents,
      maxUSDCPurchaseAmountCents
    }),
    [
      minContentPriceCents,
      maxContentPriceCents,
      minUSDCPurchaseAmountCents,
      maxUSDCPurchaseAmountCents
    ]
  )
}
