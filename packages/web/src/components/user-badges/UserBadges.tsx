import { cloneElement, MouseEvent, ReactElement, useCallback } from 'react'

import { useSelectTierInfo } from '@audius/common/hooks'
import { BadgeTier, ID } from '@audius/common/models'
import { Nullable, route } from '@audius/common/utils'
import {
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
  Text
} from '@audius/harmony'
import { Origin } from '@audius/harmony/src/components/popup/types'
import cn from 'classnames'

import { AudioHoverCard } from 'components/hover-card/AudioHoverCard'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import styles from './UserBadges.module.css'

const { AUDIO_PAGE } = route

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
  overrideTier
}: UserBadgesProps) => {
  const { tier: currentTier, isVerified } = useSelectTierInfo(userId)
  const tier = overrideTier || currentTier
  const isUserVerified = isVerifiedOverride ?? isVerified
  const hasContent = isUserVerified || tier !== 'none'

  const navigate = useNavigateToPage()

  // Create a click handler that stops propagation and navigates to AUDIO page
  const handleClick = useCallback(() => {
    navigate(AUDIO_PAGE)
  }, [navigate])

  // Create a handler to stop event propagation
  const handleStopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  if (!hasContent) return null

  // Wrap the verified badge with a HoverCard
  const verifiedBadge = isUserVerified ? (
    <HoverCard
      content={
        <Flex alignItems='center' justifyContent='center' gap='s' p='s'>
          <IconVerified size='l' />
          <Text variant='title' size='l'>
            Verified
          </Text>
        </Flex>
      }
    >
      <IconVerified height={iconSizes[size]} width={iconSizes[size]} />
    </HoverCard>
  ) : null

  // Get the tier badge and wrap it with AudioHoverCard if user has a tier
  const tierBadge =
    tier !== 'none' ? (
      <AudioHoverCard
        tier={tier}
        userId={userId}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        onClick={handleClick}
      >
        {cloneElement(audioTierMap[tier]!, { size })}
      </AudioHoverCard>
    ) : null

  return (
    <Box
      onClick={handleStopPropagation}
      css={{
        display: 'inline-block',
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
      </span>
    </Box>
  )
}

export default UserBadges
