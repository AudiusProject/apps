import { useCallback, useState } from 'react'

import { useArtistCoin, useCoinBalance, useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { formatCount, route } from '@audius/common/utils'
import {
  Artwork,
  Flex,
  HoverCard,
  HoverCardProps,
  IconArrowRight,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony'

import { useNavigateToPage } from 'hooks/useNavigateToPage'

const messages = {
  creator: 'Creator',
  member: 'Member',
  visitCoinPage: 'Visit Coin Page'
}

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
  const { spacing } = useTheme()

  // Track hover state to conditionally fetch token balance
  const [isHovered, setIsHovered] = useState(false)

  // Get user data to access artist_coin_badge
  const { data: user } = useUser(userId, {
    select: (user) => ({
      artistCoinBadge: user?.artist_coin_badge
    })
  })

  const { artistCoinBadge } = user ?? {}

  // Fetch full coin data to get name and ownerId
  const { data: coinData } = useArtistCoin(artistCoinBadge?.mint, {
    enabled: isHovered && !!artistCoinBadge?.mint
  })

  // Only fetch token balance when hovered and we have the mint address
  const { data: tokenBalance } = useCoinBalance({
    mint: artistCoinBadge?.mint ?? '',
    userId,
    enabled: isHovered && !!artistCoinBadge?.mint
  })

  // Determine if the user whose badge we're showing is the creator of this coin
  const isCreator = userId === coinData?.ownerId

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

  const coinName = coinData?.name || artistCoinBadge.ticker || ''
  const coinTicker = artistCoinBadge.ticker || ''
  const formattedBalance = tokenBalance
    ? formatCount(Number(tokenBalance.balance))
    : null

  return (
    <HoverCard
      content={
        <>
          {/* Custom Header */}
          <Flex
            w='100%'
            alignSelf='stretch'
            backgroundColor='surface1'
            borderBottom='default'
            p='xs'
            alignItems='center'
            justifyContent='space-between'
          >
            {/* Left: Creator/Member Badge */}
            <Flex alignItems='center'>
              <Text
                variant='label'
                size='m'
                color='accent'
                textTransform='uppercase'
              >
                {isCreator ? messages.creator : messages.member}
              </Text>
            </Flex>

            {/* Right: Visit Coin Page Link */}
            <PlainButton
              variant='default'
              size='default'
              iconRight={IconArrowRight}
              onClick={handleClick}
            >
              {messages.visitCoinPage}
            </PlainButton>
          </Flex>

          {/* Custom Body */}
          <Flex w='100%' p='xs' pr='4xl' column gap='xs'>
            <Flex gap='xs' alignItems='center' w='100%'>
              {/* Token Icon */}
              {artistCoinBadge?.logo_uri ? (
                <Artwork
                  src={artistCoinBadge.logo_uri}
                  hex
                  w={spacing.unit12}
                  h={spacing.unit12}
                  borderWidth={0}
                />
              ) : null}

              {/* Token Details */}
              <Flex
                column
                justifyContent='center'
                css={{ flex: 1, minWidth: 0 }}
              >
                {/* Coin Name */}
                <Text
                  variant='title'
                  size='m'
                  color='default'
                  css={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {coinName}
                </Text>

                {/* Balance and Ticker */}
                <Flex gap='xs' alignItems='center' css={{ flexWrap: 'wrap' }}>
                  {formattedBalance ? (
                    <Text variant='title' size='s' color='default'>
                      {formattedBalance}
                    </Text>
                  ) : null}
                  <Text
                    variant='label'
                    size='m'
                    color='subdued'
                    textTransform='uppercase'
                  >
                    ${coinTicker}
                  </Text>
                </Flex>
              </Flex>
            </Flex>
          </Flex>
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
