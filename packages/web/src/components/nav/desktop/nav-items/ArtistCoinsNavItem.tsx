import { route } from '@audius/common/utils'
import { IconArtistCoin } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'

const { COINS_EXPLORE_PAGE } = route

const messages = {
  title: 'Artist Coins'
}

export const ArtistCoinsNavItem = () => {
  return (
    <LeftNavLink
      leftIcon={IconArtistCoin}
      to={COINS_EXPLORE_PAGE}
      additionalPathMatches={['/coins/']}
      restriction='none'
    >
      {messages.title}
    </LeftNavLink>
  )
}
