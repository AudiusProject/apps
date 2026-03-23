import React from 'react'

import { IconArtistCoin } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  artistCoins: 'Fan Clubs'
}

export const ArtistCoinsNavItem = () => {
  return (
    <LeftNavLink
      icon={IconArtistCoin}
      label={messages.artistCoins}
      to='ArtistCoinsExplore'
    />
  )
}
