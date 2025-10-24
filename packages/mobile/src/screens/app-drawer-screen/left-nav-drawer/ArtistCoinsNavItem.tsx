import React from 'react'

import { IconArtistCoin } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  artistCoins: 'Artist Coins'
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
