import {
  cloneElement,
  MouseEvent,
  ReactElement,
  useCallback,
  useMemo
} from 'react'

import { useUser } from '@audius/common/api'
import { BadgeTier, ID } from '@audius/common/models'
import { useTierAndVerifiedForUser } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import {
  Artwork,
  Box,
  Flex,
  HoverCard,
  IconSize,
  iconSizes,
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver,
  IconVerified,
  motion,
  Text
} from '@audius/harmony'
import { Origin } from '@audius/harmony/src/components/popup/types'
import cn from 'classnames'

import { ArtistCoinHoverCard } from 'components/hover-card/ArtistCoinHoverCard'
import { AudioHoverCard } from 'components/hover-card/AudioHoverCard'
import { env } from 'services/env'

import styles from './UserBadges.module.css'

const messages = {
  verified: 'Verified'
}

export const audioTierMap: {
  [tier in BadgeTier]: Nullable<ReactElement>
} = {
  none: null,
  bronze: <IconTokenBronze />,
  silver: <IconTokenSilver />,
  gold: <IconTokenGold />,
  platinum: <IconTokenPlatinum />
}

type UserBadgesProps = {
  userId: ID
  size?: IconSize
  className?: string
  inline?: boolean
  anchorOrigin?: Origin
  transformOrigin?: Origin

  // Normally, user badges is not a controlled component and selects
  // badges off of the store. The override allows for it to be used
  // in a controlled context where the desired store state is not available.
  isVerifiedOverride?: boolean
  overrideTier?: BadgeTier

  // Optional mint address for displaying specific artist coin
  // If provided, shows the artist coin badge for that token
  mint?: string

  // Optional flag to hide the artist coin badge
  hideArtistCoinBadge?: boolean
}

/**
 * A component that renders user badges (verified and audio tier) with appropriate hover cards
 */
const UserBadges = ({
  userId,
  size = 'xs',
  className,
  inline = false,
  anchorOrigin,
  transformOrigin,
  isVerifiedOverride,
  overrideTier,
  mint,
  hideArtistCoinBadge = false
}: UserBadgesProps) => {
  const { tier: currentTier, isVerified } = useTierAndVerifiedForUser(userId)
  const { data: user } = useUser(userId, {
    select: (user) => ({
      artistCoinBadge: user?.artist_coin_badge
    })
  })

  const { artistCoinBadge: userArtistCoinBadge } = user ?? {}

  const displayMint = useMemo(() => {
    // Priority: explicit mint prop > user's artist_coin_badge > null
    if (mint) return mint
    if (userArtistCoinBadge?.mint) return userArtistCoinBadge.mint
    return null
  }, [mint, userArtistCoinBadge?.mint])

  const tier = overrideTier || currentTier
  const isUserVerified = isVerifiedOverride ?? isVerified
  const hasContent = isUserVerified || tier !== 'none' || !!displayMint

  // Create a handler to stop event propagation
  const handleStopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Wrap the verified badge with a HoverCard
  const verifiedBadge = useMemo(() => {
    if (!isUserVerified) return null

    return (
      <HoverCard
        triggeredBy='both'
        content={
          <Flex alignItems='center' justifyContent='center' gap='s' p='s'>
            <IconVerified size='l' />
            <Text variant='title' size='l'>
              {messages.verified}
            </Text>
          </Flex>
        }
      >
        <Flex
          css={{
            cursor: 'pointer',
            transition: `opacity ${motion.quick}`,
            '&:hover': {
              opacity: 0.6
            }
          }}
        >
          <IconVerified height={iconSizes[size]} width={iconSizes[size]} />
        </Flex>
      </HoverCard>
    )
  }, [isUserVerified, size])

  // Get the tier badge and wrap it with AudioHoverCard if user has a tier
  const tierBadge = useMemo(() => {
    if (tier === 'none') return null

    return (
      <AudioHoverCard
        tier={tier}
        userId={userId}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        triggeredBy='both'
      >
        <Flex
          css={{
            cursor: 'pointer',
            transition: `opacity ${motion.quick}`,
            '&:hover': {
              opacity: 0.6
            }
          }}
        >
          {cloneElement(audioTierMap[tier]!, { size })}
        </Flex>
      </AudioHoverCard>
    )
  }, [tier, userId, anchorOrigin, transformOrigin, size])

  const shouldShowArtistCoinBadge =
    !hideArtistCoinBadge &&
    !!displayMint &&
    displayMint !== env.WAUDIO_MINT_ADDRESS

  const artistCoinBadge = useMemo(() => {
    if (!shouldShowArtistCoinBadge) return null

    return (
      <ArtistCoinHoverCard
        userId={userId}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        triggeredBy='both'
      >
        <Flex
          css={{
            cursor: 'pointer',
            transition: `opacity ${motion.quick}`,
            '&:hover': {
              opacity: 0.6
            }
          }}
        >
          <Artwork
            src={userArtistCoinBadge?.logo_uri ?? ''}
            hex
            w={iconSizes[size]}
            h={iconSizes[size]}
            borderWidth={0}
          />
        </Flex>
      </ArtistCoinHoverCard>
    )
  }, [
    shouldShowArtistCoinBadge,
    userId,
    anchorOrigin,
    transformOrigin,
    userArtistCoinBadge?.logo_uri,
    size
  ])

  if (!hasContent) return null

  return (
    <Box
      onClick={handleStopPropagation}
      css={{
        height: '100%',
        display: 'inline-flex',
        position: 'relative',
        pointerEvents: 'auto'
      }}
    >
      <span
        className={cn(
          {
            [styles.inlineContainer]: inline,
            [styles.container]: !inline
          },
          className
        )}
      >
        {verifiedBadge}
        {tierBadge}
        {artistCoinBadge}
      </span>
    </Box>
  )
}

export default UserBadges
