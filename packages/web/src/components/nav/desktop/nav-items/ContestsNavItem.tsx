import React from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { route } from '@audius/common/utils'
import { IconRemix } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'
import { NavSpeakerIcon } from '../NavSpeakerIcon'
import { useNavSourcePlayingStatus } from '../useNavSourcePlayingStatus'

const { CONTESTS_PAGE } = route

export const ContestsNavItem = () => {
  const { isEnabled: isContestsPageEnabled } = useFeatureFlag(
    FeatureFlags.CONTESTS
  )
  const playingFromRoute = useNavSourcePlayingStatus()

  if (!isContestsPageEnabled) return null

  return (
    <LeftNavLink
      leftIcon={IconRemix}
      to={CONTESTS_PAGE}
      restriction='none'
      rightIcon={
        <NavSpeakerIcon
          playingFromRoute={playingFromRoute}
          targetRoute={CONTESTS_PAGE}
        />
      }
    >
      Contests
    </LeftNavLink>
  )
}
