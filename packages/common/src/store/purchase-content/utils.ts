import { UsdcWei } from '@audius/fixed-decimal'

import { Nullable } from '~/utils/typeUtils'

import { PurchaseContentStage } from './types'

export const zeroBalance = () => BigInt(0) as UsdcWei

const USDC_CENT_WEI = BigInt(10000) as UsdcWei

export const isContentPurchaseInProgress = (stage: PurchaseContentStage) => {
  return [
    PurchaseContentStage.START,
    PurchaseContentStage.BUY_USDC,
    PurchaseContentStage.PURCHASING,
    PurchaseContentStage.CONFIRMING_PURCHASE
  ].includes(stage)
}

type PurchaseSummaryValues = {
  amountDue: number
  existingBalance: number | undefined
  basePrice: number
  extraAmount?: number
  totalPrice: number
}

type GetPurchaseSummaryValuesArgs = {
  price: number
  currentBalance: Nullable<UsdcWei>
  minPurchaseAmountCents: number
  extraAmount?: number
}

export const getPurchaseSummaryValues = ({
  price,
  currentBalance,
  extraAmount,
  minPurchaseAmountCents
}: GetPurchaseSummaryValuesArgs): PurchaseSummaryValues => {
  let amountDue = price + (extraAmount ?? 0)
  let existingBalance
  const balanceWei =
    currentBalance && currentBalance > USDC_CENT_WEI
      ? currentBalance
      : zeroBalance()
  const amountDueWei = (BigInt(Math.round(amountDue)) *
    USDC_CENT_WEI) as UsdcWei

  if (balanceWei >= amountDueWei) {
    existingBalance = amountDue
    amountDue = 0
  } else {
    const diff = amountDueWei - balanceWei
    const diffCents = Number((diff + USDC_CENT_WEI - BigInt(1)) / USDC_CENT_WEI)

    if (diffCents > 0 && diffCents >= minPurchaseAmountCents) {
      amountDue = diffCents
      existingBalance = Number(balanceWei / USDC_CENT_WEI)
    }
  }

  return {
    amountDue,
    existingBalance,
    basePrice: price,
    extraAmount,
    totalPrice: price + (extraAmount ?? 0)
  }
}

export function getBalanceNeeded(
  totalAmountDue: UsdcWei,
  existingBalance: UsdcWei,
  minPurchaseAmountCents: number
) {
  const diff = totalAmountDue - existingBalance
  const minPurchaseAmountWei = (BigInt(minPurchaseAmountCents) *
    USDC_CENT_WEI) as UsdcWei

  if (diff >= minPurchaseAmountWei) {
    return diff as UsdcWei
  } else if (diff > BigInt(0)) {
    return totalAmountDue
  }
  return BigInt(0) as UsdcWei
}
