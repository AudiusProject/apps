import {
  useUSDCPurchaseConfig,
  usePayExtraPresets,
  getExtraAmount,
  PayExtraPreset,
  CUSTOM_AMOUNT,
  AMOUNT_PRESET
} from '@audius/common/hooks'
import { getPurchaseSummaryValues } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import type { UsdcWei } from '@audius/fixed-decimal'
import { useField } from 'formik'

export const usePurchaseSummaryValues = ({
  price,
  currentBalance
}: {
  price: number
  currentBalance: Nullable<UsdcWei>
}) => {
  const [{ value: customAmount }] = useField(CUSTOM_AMOUNT)
  const [{ value: amountPreset }] = useField(AMOUNT_PRESET)
  const presetValues = usePayExtraPresets()
  const { minUSDCPurchaseAmountCents } = useUSDCPurchaseConfig()

  const extraAmount = getExtraAmount({
    amountPreset,
    presetValues,
    customAmount
  })

  const purchaseSummaryValues = getPurchaseSummaryValues({
    extraAmount: amountPreset === PayExtraPreset.NONE ? undefined : extraAmount,
    price,
    currentBalance,
    minPurchaseAmountCents: minUSDCPurchaseAmountCents
  })

  return purchaseSummaryValues
}
