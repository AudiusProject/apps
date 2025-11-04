import { useCallback } from 'react'

import { useArtistCreatedCoin } from '@audius/common/api'
import { css } from '@emotion/native'
import { TouchableOpacity } from 'react-native'

import { ProfilePicture, TokenIcon } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { env } from 'app/services/env'
import { zIndex } from 'app/utils/zIndex'

const messages = {
  artistCoinBadge: 'Artist coin badge'
}

export type ArtistProfilePictureProps = {
  userId: number
}

export const ArtistProfilePicture = ({ userId }: ArtistProfilePictureProps) => {
  const navigation = useNavigation()

  const { data: ownedCoin } = useArtistCreatedCoin(userId)

  const shouldShowArtistCoinBadge =
    !!ownedCoin?.mint &&
    !!ownedCoin?.logoUri &&
    ownedCoin.mint !== env.WAUDIO_MINT_ADDRESS

  const handleCoinPress = useCallback(() => {
    if (ownedCoin?.ticker) {
      navigation.navigate('CoinDetailsScreen', {
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
            zIndex: zIndex.PROFILE_PAGE_PROFILE_PICTURE + 1
          })}
        >
          <TokenIcon logoURI={ownedCoin?.logoUri} size='l' />
        </TouchableOpacity>
      )}
    </>
  )
}
