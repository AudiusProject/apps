import { useUSDCBalance } from '@audius/common/api'
import {
  purchaseContentSelectors,
  isContentPurchaseInProgress
} from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import type { UsdcWei } from '@audius/fixed-decimal'
import { useSelector } from 'react-redux'

import { usePurchaseSummaryValues } from './usePurchaseSummaryValues'

const {
  getPurchaseContentFlowStage,
  getPurchaseContentError,
  getPurchaseContentPage
} = purchaseContentSelectors

export const usePurchaseContentFormState = ({ price }: { price: number }) => {
  const page = useSelector(getPurchaseContentPage)
  const stage = useSelector(getPurchaseContentFlowStage)
  const error = useSelector(getPurchaseContentError)
  const isUnlocking = !error && isContentPurchaseInProgress(stage)

  const { data: currentBalance } = useUSDCBalance()

  const purchaseSummaryValues = usePurchaseSummaryValues({
    price,
    currentBalance: currentBalance as Nullable<UsdcWei>
  })

  return {
    page,
    stage,
    error,
    isUnlocking,
    purchaseSummaryValues
  }
}

export type PurchaseContentFormState = ReturnType<
  typeof usePurchaseContentFormState
>
