import { useCallback, useState } from 'react'

import { useTokenBalance } from '@audius/common/api'
import { AudioTiers, BadgeTier, ID } from '@audius/common/models'
import { AUDIO_TICKER } from '@audius/common/store'
import { formatCount, route } from '@audius/common/utils'
import {
  HoverCard,
  HoverCardHeader,
  HoverCardProps,
  IconArrowRight,
  IconComponent,
  IconTokenAUDIO,
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver,
  useTheme
} from '@audius/harmony'
import { useNavigate } from 'react-router-dom-v5-compat'

import { env } from 'services/env'

import { HoverCardBody } from './HoverCardBody'

type AudioHoverCardProps = Pick<
  HoverCardProps,
  | 'children'
  | 'onClose'
  | 'onClick'
  | 'anchorOrigin'
  | 'transformOrigin'
  | 'triggeredBy'
> & {
  /**
   * The $AUDIO tier to display
   */
  tier: AudioTiers

  /**
   * The user ID to fetch balance and tier information for
   */
  userId: ID
}

// Audio tier badge map for header icons
const audioTierBadgeMap: Record<AudioTiers, IconComponent> = {
  bronze: IconTokenBronze,
  silver: IconTokenSilver,
  gold: IconTokenGold,
  platinum: IconTokenPlatinum
}

const getBadgeName = (tier: BadgeTier) => {
  return `${tier} Badge`
}

/**
 * A complete HoverCard for $AUDIO badge tiers that includes both header and body
 */
export const AudioHoverCard = ({
  children,
  tier,
  userId,
  onClose,
  anchorOrigin,
  transformOrigin,
  onClick,
  triggeredBy
}: AudioHoverCardProps) => {
  const navigate = useNavigate()
  const { cornerRadius } = useTheme()

  // Track hover state to conditionally fetch token balance
  const [isHovered, setIsHovered] = useState(false)

  const handleHover = useCallback((hovered: boolean) => {
    setIsHovered(hovered)
  }, [])

  const { data: tokenBalance } = useTokenBalance({
    mint: env.WAUDIO_MINT_ADDRESS,
    userId,
    enabled: isHovered
  })

  const formattedBalance = tokenBalance
    ? formatCount(Number(tokenBalance.balance))
    : null

  const handleClick = useCallback(() => {
    onClick?.()
    onClose?.()
    navigate(route.coinPage(AUDIO_TICKER))
  }, [navigate, onClick, onClose])

  return (
    <HoverCard
      content={
        <>
          <HoverCardHeader
            iconLeft={audioTierBadgeMap[tier]}
            title={getBadgeName(tier)}
            onClick={handleClick}
            onClose={onClose}
            iconRight={IconArrowRight}
          />
          <HoverCardBody
            icon={
              <IconTokenAUDIO
                size='3xl'
                css={{ borderRadius: cornerRadius.circle }}
                hex
              />
            }
            amount={formattedBalance}
          />
        </>
      }
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      onClick={handleClick}
      triggeredBy={triggeredBy}
      onHover={handleHover}
    >
      {children}
    </HoverCard>
  )
}
