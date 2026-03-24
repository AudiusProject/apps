import { route } from '@audius/common/utils'
import { IconArtistCoin } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'

const { CLUBS_EXPLORE_PAGE } = route

const messages = {
  title: 'Fan Clubs'
}

export const ArtistCoinsNavItem = () => {
  return (
    <LeftNavLink
      leftIcon={IconArtistCoin}
      to={CLUBS_EXPLORE_PAGE}
      additionalPathMatches={['/coins/']}
      restriction='none'
    >
      {messages.title}
    </LeftNavLink>
  )
}
