import React from 'react'

import { route } from '@audius/common/utils'
import { IconGift } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'

export const RewardsNavItem = () => (
  <LeftNavLink leftIcon={IconGift} to={route.REWARDS_PAGE} restriction='none'>
    Rewards
  </LeftNavLink>
)
