import React from 'react'

import { IconFanClub } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  fanClubs: 'Fan Clubs'
}

export const FanClubsNavItem = () => {
  return (
    <LeftNavLink
      icon={IconFanClub}
      label={messages.fanClubs}
      to='FanClubsExplore'
    />
  )
}
