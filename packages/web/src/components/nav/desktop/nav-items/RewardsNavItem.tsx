import React from 'react'

import { useHasAccount } from '@audius/common/api'
import { useChallengeCooldownSchedule } from '@audius/common/hooks'
import { route } from '@audius/common/utils'
import { IconGift, NotificationCount } from '@audius/harmony'
import { useLocation } from 'react-router'

import { matchesRoute } from 'utils/route'

import { LeftNavLink } from '../LeftNavLink'

const { REWARDS_PAGE } = route

export const RewardsNavItem = () => {
  const hasAccount = useHasAccount()
  const { claimableAmount } = useChallengeCooldownSchedule({
    multiple: true
  })
  const location = useLocation()

  return (
    <LeftNavLink
      leftIcon={IconGift}
      to={REWARDS_PAGE}
      disabled={!hasAccount}
      restriction='account'
      hasNotification={claimableAmount > 0}
      rightIcon={
        claimableAmount > 0 ? (
          <NotificationCount
            count={claimableAmount}
            isSelected={matchesRoute({
              current: location.pathname,
              target: REWARDS_PAGE
            })}
          />
        ) : undefined
      }
    >
      Rewards
    </LeftNavLink>
  )
}
