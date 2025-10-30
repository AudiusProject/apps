import { FixedDecimal } from '@audius/fixed-decimal'

import { useCoinBalance, useQueryContext } from '~/api'
import type { BuySellTab } from '~/store/ui/buy-sell/types'

/**
 * Hook that determines the initial tab for buy/sell modals based on user balances.
 * If user has AUDIO balance but no USDC balance, defaults to 'convert' tab.
 * Otherwise defaults to 'buy' tab.
 */
export const useBuySellInitialTab = (externalBalances?: {
  externalUsdcBalance?: FixedDecimal
  externalAudioBalance?: FixedDecimal
}): BuySellTab => {
  const { env } = useQueryContext()

  // Check USDC and AUDIO balances to determine initial tab
  const { data: internalUsdcBalance } = useCoinBalance({
    mint: env.USDC_MINT_ADDRESS
  })
  const { data: internalAudioBalance } = useCoinBalance({
    mint: env.WAUDIO_MINT_ADDRESS
  })
  const { externalUsdcBalance, externalAudioBalance } = externalBalances ?? {}
  const usdcBalance = externalUsdcBalance ?? internalUsdcBalance?.balance ?? 0
  const audioBalance =
    externalAudioBalance ?? internalAudioBalance?.balance ?? 0

  // Determine initial tab based on balances
  const hasUSDCBalance = Number(usdcBalance.toString()) > 0
  const hasAudioBalance = Number(audioBalance.toString()) > 0

  return !hasUSDCBalance && hasAudioBalance ? 'convert' : 'buy'
}
