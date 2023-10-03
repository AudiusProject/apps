import type { Nullable, BNUSDC } from '@audius/common'
import {
  CUSTOM_AMOUNT,
  AMOUNT_PRESET,
  getExtraAmount,
  getPurchaseSummaryValues,
  PayExtraPreset
} from '@audius/common'
import { useField } from 'formik'

export const usePurchaseSummaryValues = ({
  price,
  currentBalance
}: {
  price: number
  currentBalance: Nullable<BNUSDC>
}) => {
  const [{ value: customAmount }] = useField(CUSTOM_AMOUNT)
  const [{ value: extraAmountPreset }] = useField(AMOUNT_PRESET)

  const extraAmount = getExtraAmount(extraAmountPreset, customAmount)

  const purchaseSummaryValues = getPurchaseSummaryValues({
    // Passing undefined for the None case so that the row doesn't render.
    // In other cases, the user may have input 0 and we want to show the row
    // to reflect that until they explicitly select no preset
    extraAmount:
      extraAmountPreset === PayExtraPreset.NONE ? undefined : extraAmount,
    price,
    currentBalance
  })

  return purchaseSummaryValues
}
