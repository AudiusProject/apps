import React from 'react'

import { useCurrentAccountUser, useHasAccount } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { IconDashboard } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'

const { DASHBOARD_PAGE } = route

export const DashboardNavItem = () => {
  const hasAccount = useHasAccount()
  const { data: trackCount } = useCurrentAccountUser({
    select: (user) => user?.track_count
  })

  return trackCount ? (
    <LeftNavLink
      leftIcon={IconDashboard}
      to={DASHBOARD_PAGE}
      disabled={!hasAccount}
      restriction='account'
    >
      Dashboard
    </LeftNavLink>
  ) : null
}
