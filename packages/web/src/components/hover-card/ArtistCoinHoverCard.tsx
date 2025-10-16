import { useCallback, useState } from 'react'

import { useCoinBalance, useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { route, formatCount } from '@audius/common/utils'
import {
  Artwork,
  HoverCard,
  HoverCardHeader,
  HoverCardProps,
  IconArrowRight,
  useTheme
} from '@audius/harmony'

import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { HoverCardBody } from './HoverCardBody'

type ArtistCoinHoverCardProps = Pick<
  HoverCardProps,
  | 'children'
  | 'onClose'
  | 'onClick'
  | 'anchorOrigin'
  | 'transformOrigin'
  | 'triggeredBy'
> & {
  /**
   * The user ID to fetch coin data and balance information for
   */
  userId: ID
}

/**
 * A complete HoverCard for artist coin badges that includes both header and body
 */
export const ArtistCoinHoverCard = ({
  children,
  userId,
  onClose,
  anchorOrigin,
  transformOrigin,
  onClick,
  triggeredBy
}: ArtistCoinHoverCardProps) => {
  const navigate = useNavigateToPage()
  const { cornerRadius, spacing } = useTheme()

  // Track hover state to conditionally fetch token balance
  const [isHovered, setIsHovered] = useState(false)

  // Get user data to access artist_coin_badge
  const { data: user } = useUser(userId, {
    select: (user) => ({
      artistCoinBadge: user?.artist_coin_badge
    })
  })

  const { artistCoinBadge } = user ?? {}

  // Only fetch token balance when hovered and we have the mint address
  const { data: tokenBalance } = useCoinBalance({
    mint: artistCoinBadge?.mint ?? '',
    userId,
    enabled: isHovered && !!artistCoinBadge?.mint
  })

  const handleClick = useCallback(() => {
    onClick?.()
    onClose?.()
    if (artistCoinBadge?.ticker) {
      navigate(route.coinPage(artistCoinBadge.ticker))
    }
  }, [onClick, onClose, navigate, artistCoinBadge?.ticker])

  // Don't render if we don't have the basic coin info
  if (!artistCoinBadge?.ticker || !artistCoinBadge?.logo_uri) {
    return null
  }

  const coinName = artistCoinBadge.ticker || ''
  const formattedBalance = tokenBalance
    ? formatCount(Number(tokenBalance.balance))
    : null

  return (
    <HoverCard
      content={
        <>
          <HoverCardHeader
            iconLeft={() =>
              artistCoinBadge?.logo_uri ? (
                <Artwork
                  src={artistCoinBadge.logo_uri}
                  hex
                  w={spacing.unit6}
                  h={spacing.unit6}
                  borderWidth={0}
                />
              ) : null
            }
            title={coinName}
            onClick={handleClick}
            onClose={onClose}
            iconRight={IconArrowRight}
          />
          <HoverCardBody
            icon={
              artistCoinBadge?.logo_uri ? (
                <Artwork
                  src={artistCoinBadge.logo_uri}
                  hex
                  w={spacing.unit16}
                  h={spacing.unit16}
                  borderWidth={0}
                  css={{ borderRadius: cornerRadius.circle }}
                />
              ) : null
            }
            amount={formattedBalance}
            currency={coinName}
          />
        </>
      }
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      onClick={handleClick}
      triggeredBy={triggeredBy}
      onHover={setIsHovered}
    >
      {children}
    </HoverCard>
  )
}
