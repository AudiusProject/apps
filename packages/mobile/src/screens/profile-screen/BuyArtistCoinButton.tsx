import { useCallback } from 'react'

import { useArtistCreatedCoin } from '@audius/common/api'

import { Button, useTheme } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  viewFanClub: 'View Fan Club'
}

export const BuyArtistCoinButton = ({ userId }: { userId: number }) => {
  const { color } = useTheme()
  const navigation = useNavigation()

  const { data: artistCoin } = useArtistCreatedCoin(userId)

  const handlePress = useCallback(() => {
    if (artistCoin?.ticker) {
      navigation.navigate('CoinDetailsScreen', {
        ticker: artistCoin.ticker
      })
    }
  }, [navigation, artistCoin?.ticker])

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
      {messages.viewFanClub}
    </Button>
  )
}
