import React from 'react'

import { route } from '@audius/common/utils'
import { IconTrophy } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'
import { NavSpeakerIcon } from '../NavSpeakerIcon'
import { useNavSourcePlayingStatus } from '../useNavSourcePlayingStatus'

const { CONTESTS_PAGE } = route

export const ContestsNavItem = () => {
  const playingFromRoute = useNavSourcePlayingStatus()

  return (
    <LeftNavLink
      leftIcon={IconTrophy}
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
