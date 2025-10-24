import { useMemo } from 'react'

import { USDC, UsdcWei } from '@audius/fixed-decimal'

import { formatCount, formatCurrencyWithSubscript } from '~/utils'

import { useUSDCBalance } from '../api/tan-query/wallets/useUSDCBalance'
import { Status } from '../models'

type UseFormattedUSDCBalanceReturn = {
  balance: UsdcWei | null
  balanceFormatted: string | null
  balanceCents: number
  usdcValue: ReturnType<typeof USDC>
  isLoading: boolean
  status: Status
  heldValue: number | null
  formattedHeldValue: string | null
}

export const useFormattedUSDCBalance = (): UseFormattedUSDCBalanceReturn => {
  const { data: balance, status: balanceStatus } = useUSDCBalance({
    isPolling: true
  })
  const usdcValue = USDC(balance ?? (BigInt(0) as UsdcWei)).floor(2)
  const balanceCents = Number(usdcValue.floor(2).toString()) * 100
  const balanceFormatted = useMemo(() => {
    const balance =
      balanceStatus === Status.LOADING ? null : usdcValue.toShorthand()
    return balance ? `$${balance}` : null
  }, [usdcValue, balanceStatus])

  const isLoading = balanceStatus === Status.LOADING

  const heldValue = balance ? Number(balance) : null
  const formattedHeldValue = heldValue
    ? heldValue >= 1
      ? `$${formatCount(heldValue, 2)}`
      : formatCurrencyWithSubscript(heldValue)
    : null

  return {
    balance,
    balanceFormatted,
    balanceCents,
    usdcValue,
    isLoading,
    status: balanceStatus,
    heldValue,
    formattedHeldValue
  }
}
