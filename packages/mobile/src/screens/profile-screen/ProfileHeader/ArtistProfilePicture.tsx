import { useCallback, useState } from 'react'

import { useArtistCreatedFanClub } from '@audius/common/api'
import { css } from '@emotion/native'
import { TouchableOpacity } from 'react-native'

import { ProfilePicture, TokenIcon } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { env } from 'app/services/env'
import { zIndex } from 'app/utils/zIndex'

import { AvatarViewer } from '../AvatarViewer'

const messages = {
  fanClubBadge: 'Fan club badge',
  viewAvatar: 'View profile picture'
}

export type ArtistProfilePictureProps = {
  userId: number
}

export const ArtistProfilePicture = ({ userId }: ArtistProfilePictureProps) => {
  const navigation = useNavigation()

  const { data: ownedCoin } = useArtistCreatedFanClub(userId)

  const shouldShowFanClubBadge =
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

  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const handleOpenViewer = useCallback(() => setIsViewerOpen(true), [])
  const handleCloseViewer = useCallback(() => setIsViewerOpen(false), [])

  return (
    <>
      <TouchableOpacity
        onPress={handleOpenViewer}
        activeOpacity={0.85}
        accessibilityLabel={messages.viewAvatar}
        accessibilityRole='imagebutton'
      >
        <ProfilePicture userId={userId} size='xl' />
      </TouchableOpacity>
      {shouldShowFanClubBadge && (
        <TouchableOpacity
          onPress={handleCoinPress}
          accessibilityLabel={messages.fanClubBadge}
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
      <AvatarViewer
        userId={userId}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </>
  )
}
