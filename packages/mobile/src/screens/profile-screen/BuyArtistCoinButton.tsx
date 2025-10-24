import { useCallback } from 'react'

import { useArtistOwnedCoin } from '@audius/common/api'
import { useBuySellInitialTab } from '@audius/common/hooks'

import { Button, useTheme } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  title: 'Buy Artist Coin'
}

export const BuyArtistCoinButton = ({ userId }: { userId: number }) => {
  const { color } = useTheme()
  const navigation = useNavigation()

  const { data: artistCoin } = useArtistOwnedCoin(userId)
  const initialTab = useBuySellInitialTab()

  const handlePress = useCallback(() => {
    if (artistCoin?.ticker) {
      navigation.navigate('BuySell', {
        initialTab,
        coinTicker: artistCoin.ticker
      })
    }
  }, [navigation, artistCoin?.ticker, initialTab])

  // Don't render if user doesn't own a coin
  if (!artistCoin?.mint) {
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
