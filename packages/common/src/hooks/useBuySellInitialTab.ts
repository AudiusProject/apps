import { useCoinBalance, useQueryContext } from '~/api'
import type { BuySellTab } from '~/store/ui/buy-sell/types'

/**
 * Hook that determines the initial tab for buy/sell modals based on user balances.
 * If user has AUDIO balance but no USDC balance, defaults to 'convert' tab.
 * Otherwise defaults to 'buy' tab.
 */
export const useBuySellInitialTab = (): BuySellTab => {
  const { env } = useQueryContext()

  // Check USDC and AUDIO balances to determine initial tab
  const { data: usdcBalance } = useCoinBalance({
    mint: env.USDC_MINT_ADDRESS
  })
  const { data: audioBalance } = useCoinBalance({
    mint: env.WAUDIO_MINT_ADDRESS
  })

  // Determine initial tab based on balances
  const hasUSDCBalance =
    usdcBalance && Number(usdcBalance.balance.toString()) > 0
  const hasAudioBalance =
    audioBalance && Number(audioBalance.balance.toString()) > 0

  return !hasUSDCBalance && hasAudioBalance ? 'convert' : 'buy'
}
