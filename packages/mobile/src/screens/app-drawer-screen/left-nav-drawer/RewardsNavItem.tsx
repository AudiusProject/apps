import React from 'react'

import { IconGift } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

export const RewardsNavItem = () => (
  <LeftNavLink icon={IconGift} label='Rewards' to='RewardsScreen' />
)
