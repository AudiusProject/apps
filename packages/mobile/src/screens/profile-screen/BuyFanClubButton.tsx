import { useCallback } from 'react'

import { useArtistCreatedFanClub } from '@audius/common/api'

import { Button, useTheme } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = {
  viewFanClub: 'View Fan Club'
}

export const BuyFanClubButton = ({ userId }: { userId: number }) => {
  const { color } = useTheme()
  const navigation = useNavigation()

  const { data: fanClub } = useArtistCreatedFanClub(userId)

  const handlePress = useCallback(() => {
    if (fanClub?.ticker) {
      navigation.navigate('CoinDetailsScreen', {
        ticker: fanClub.ticker
      })
    }
  }, [navigation, fanClub?.ticker])

  // Don't render if user doesn't own a coin
  if (!fanClub?.mint) {
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
