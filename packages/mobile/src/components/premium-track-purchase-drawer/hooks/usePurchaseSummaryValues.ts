import type { Nullable, BNUSDC } from '@audius/common'
import {
  CUSTOM_AMOUNT,
  AMOUNT_PRESET,
  getExtraAmount,
  getPurchaseSummaryValues,
  PayExtraPreset,
  usePayExtraPresets,
  useUSDCPurchaseConfig
} from '@audius/common'
import { useField } from 'formik'

import { useRemoteVar } from 'app/hooks/useRemoteConfig'

export const usePurchaseSummaryValues = ({
  price,
  currentBalance
}: {
  price: number
  currentBalance: Nullable<BNUSDC>
}) => {
  const [{ value: customAmount }] = useField(CUSTOM_AMOUNT)
  const [{ value: amountPreset }] = useField(AMOUNT_PRESET)
  const presetValues = usePayExtraPresets(useRemoteVar)
  const { minUSDCPurchaseAmountCents } = useUSDCPurchaseConfig(useRemoteVar)

  const extraAmount = getExtraAmount({
    amountPreset,
    presetValues,
    customAmount
  })

  const purchaseSummaryValues = getPurchaseSummaryValues({
    // Passing undefined for the None case so that the row doesn't render.
    // In other cases, the user may have input 0 and we want to show the row
    // to reflect that until they explicitly select no preset
    extraAmount: amountPreset === PayExtraPreset.NONE ? undefined : extraAmount,
    price,
    currentBalance,
    minPurchaseAmountCents: minUSDCPurchaseAmountCents
  })

  return purchaseSummaryValues
}
