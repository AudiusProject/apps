import { useCallback } from 'react'

import { useArtistOwnedCoin, useTokenBalance, useQueryContext } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { Button, useTheme } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  title: 'Buy Artist Coin'
}

export const BuyArtistCoinButton = ({ userId }: { userId: number }) => {
  const { color } = useTheme()
  const navigation = useNavigation()
  const { isEnabled: isArtistCoinsEnabled } = useFeatureFlag(
    FeatureFlags.ARTIST_COINS
  )

  const { data: artistCoin } = useArtistOwnedCoin(userId)
  const { env } = useQueryContext()

  // Check USDC and AUDIO balances to determine initial tab
  const { data: usdcBalance } = useTokenBalance({
    mint: env.USDC_MINT_ADDRESS
  })
  const { data: audioBalance } = useTokenBalance({
    mint: env.WAUDIO_MINT_ADDRESS
  })

  // Determine initial tab based on balances
  const hasUSDCBalance = usdcBalance && Number(usdcBalance.balance.toString()) > 0
  const hasAudioBalance = audioBalance && Number(audioBalance.balance.toString()) > 0
  const initialTab = !hasUSDCBalance && hasAudioBalance ? 'convert' : 'buy'

  const handlePress = useCallback(() => {
    if (artistCoin?.ticker) {
      navigation.navigate('BuySell', {
        initialTab,
        coinTicker: artistCoin.ticker
      })
    }
  }, [navigation, artistCoin?.ticker, initialTab])

  // Don't render if artist coins feature is disabled or user doesn't own a coin
  if (!isArtistCoinsEnabled || !artistCoin?.mint) {
    return null
  }

  return (
    <Button
      size='small'
      gradient={color.special.coinGradient}
      fullWidth
      onPress={handlePress}
    >
      {messages.title}
    </Button>
  )
}
