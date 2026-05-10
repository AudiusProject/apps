import React from 'react'

import { route } from '@audius/common/utils'

import { HomePageIcon } from 'pages/home-page/icon'

import { LeftNavLink } from '../LeftNavLink'
import { NavSpeakerIcon } from '../NavSpeakerIcon'
import { useNavSourcePlayingStatus } from '../useNavSourcePlayingStatus'

const { HOMEPAGE_PAGE } = route

export const HomeNavItem = () => {
  const playingFromRoute = useNavSourcePlayingStatus()

  return (
    <LeftNavLink
      leftIcon={HomePageIcon}
      to={HOMEPAGE_PAGE}
      restriction='none'
      rightIcon={
        <NavSpeakerIcon
          playingFromRoute={playingFromRoute}
          targetRoute={HOMEPAGE_PAGE}
        />
      }
    >
      Home
    </LeftNavLink>
  )
}
