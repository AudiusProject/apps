import React from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { IconTrophy } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  contests: 'Contests'
}

export const ContestsNavItem = () => {
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS
  )

  if (!isContestsPageEnabled) return null

  return (
    <LeftNavLink icon={IconTrophy} label={messages.contests} to='Contests' />
  )
}
