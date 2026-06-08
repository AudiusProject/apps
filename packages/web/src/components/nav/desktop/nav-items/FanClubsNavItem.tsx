import { route } from '@audius/common/utils'
import { IconFanClub } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'

const { CLUBS_EXPLORE_PAGE } = route

const messages = {
  title: 'Fan Clubs'
}

export const FanClubsNavItem = () => {
  return (
    <LeftNavLink
      leftIcon={IconFanClub}
      to={CLUBS_EXPLORE_PAGE}
      additionalPathMatches={['/coins/']}
      restriction='none'
    >
      {messages.title}
    </LeftNavLink>
  )
}
