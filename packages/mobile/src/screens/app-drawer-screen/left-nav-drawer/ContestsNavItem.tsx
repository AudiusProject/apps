import React from 'react'

import { IconTrophy } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  contests: 'Contests'
}

export const ContestsNavItem = () => {
  return (
    <LeftNavLink icon={IconTrophy} label={messages.contests} to='Contests' />
  )
}
