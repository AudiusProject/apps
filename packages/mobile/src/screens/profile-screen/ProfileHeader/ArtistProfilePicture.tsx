import { useCallback, useMemo } from 'react'

import { useUserCreatedCoins } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { css } from '@emotion/native'
import { useNavigation } from '@react-navigation/native'
import { TouchableOpacity } from 'react-native'

import { ProfilePicture, TokenIcon } from 'app/components/core'
import { env } from 'app/services/env'

const messages = {
  artistCoinBadge: 'Artist coin badge'
}

export type ArtistProfilePictureProps = {
  userId: number
}

export const ArtistProfilePicture = ({ userId }: ArtistProfilePictureProps) => {
  const navigation = useNavigation()

  const { isEnabled: isArtistCoinsEnabled } = useFeatureFlag(
    FeatureFlags.ARTIST_COINS
  )

  const { data: ownedCoins } = useUserCreatedCoins({
    userId,
    limit: 1
  })
  const ownedCoin = ownedCoins?.[0]

  const shouldShowArtistCoinBadge = useMemo(() => {
    if (!isArtistCoinsEnabled || !ownedCoin?.mint || !ownedCoin?.logoUri) {
      return false
    }

    // Don't show for wAUDIO
    if (ownedCoin.mint === env.WAUDIO_MINT_ADDRESS) {
      return false
    }

    return true
  }, [isArtistCoinsEnabled, ownedCoin?.mint, ownedCoin?.logoUri])

  const handleCoinPress = useCallback(() => {
    if (ownedCoin?.ticker) {
      ;(navigation as any).navigate('CoinDetailsScreen', {
        ticker: ownedCoin.ticker
      })
    }
  }, [navigation, ownedCoin?.ticker])

  return (
    <>
      <ProfilePicture userId={userId} size='xl' />
      {shouldShowArtistCoinBadge && (
        <TouchableOpacity
          onPress={handleCoinPress}
          accessibilityLabel={messages.artistCoinBadge}
          style={css({
            position: 'absolute',
            bottom: 0,
            right: 0,
            zIndex: 10
          })}
        >
          <TokenIcon logoURI={ownedCoin?.logoUri} size='l' />
        </TouchableOpacity>
      )}
    </>
  )
}
