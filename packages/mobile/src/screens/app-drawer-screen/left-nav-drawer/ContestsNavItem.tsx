import React from 'react'

import { IconRemix } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  contests: 'Contests'
}

export const ContestsNavItem = () => {
  return (
    <LeftNavLink icon={IconRemix} label={messages.contests} to='Contests' />
  )
}
