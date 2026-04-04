import { cloneElement, ReactElement } from 'react'

import { BadgeTier } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'

// Inlined from @audius/common/store to avoid circular dependency
// (store/wallet/utils → api barrel → upload modules → store)
const badgeTiers: { tier: BadgeTier; humanReadableAmount: number }[] = [
  { tier: 'platinum', humanReadableAmount: 10000 },
  { tier: 'gold', humanReadableAmount: 1000 },
  { tier: 'silver', humanReadableAmount: 100 },
  { tier: 'bronze', humanReadableAmount: 10 },
  { tier: 'none', humanReadableAmount: 0 }
]
import { User } from '@audius/sdk'
import cn from 'classnames'

import IconBronzeBadgeSVG from 'assets/img/iconBronzeBadge.svg'
import IconGoldBadgeSVG from 'assets/img/iconGoldBadge.svg'
import IconPlatinumBadgeSVG from 'assets/img/iconPlatinumBadge.svg'
import IconSilverBadgeSVG from 'assets/img/iconSilverBadge.svg'
import IconVerifiedSVG from 'assets/img/iconVerified.svg'

import styles from './AudiusProfileBadges.module.css'

const audioTierMapSVG: { [tier in BadgeTier]: Nullable<ReactElement> } = {
  none: null,
  bronze: <IconBronzeBadgeSVG />,
  silver: <IconSilverBadgeSVG />,
  gold: <IconGoldBadgeSVG />,
  platinum: <IconPlatinumBadgeSVG />
}

type UserBadgesProps = {
  audiusProfile: User
  badgeSize: number
  className?: string
  inline?: boolean

  /**
   * When `true` provide styles for container when it has no content.
   * Useful for cases where margins are inconsistent.
   */
  noContentClassName?: string
}

const getTierForBalance = (balance: number) => {
  const index = badgeTiers.findIndex((t) => {
    return t.humanReadableAmount <= balance
  })

  const tier = index === -1 ? 'none' : badgeTiers[index].tier

  return { tier }
}

const UserBadges = ({
  audiusProfile,
  badgeSize,
  className,
  noContentClassName = '',
  inline = false
}: UserBadgesProps) => {
  const { isVerified, totalAudioBalance } = audiusProfile
  const { tier } = getTierForBalance(totalAudioBalance ?? 0)

  const tierMap = audioTierMapSVG
  const audioBadge = tierMap[tier as BadgeTier]
  const hasContent = isVerified || audioBadge
  const content = (
    <>
      {!isVerified ? null : (
        <IconVerifiedSVG
          className={styles.iconVerified}
          height={badgeSize}
          width={badgeSize}
        />
      )}
      {audioBadge == null
        ? null
        : cloneElement(audioBadge, { height: badgeSize, width: badgeSize })}
    </>
  )

  if (inline) {
    return (
      <span
        className={cn(styles.inlineContainer, className, {
          [noContentClassName]: !hasContent
        })}
      >
        {content}
      </span>
    )
  }
  return (
    <div
      className={cn(styles.container, className, {
        [noContentClassName]: !hasContent
      })}
    >
      {content}
    </div>
  )
}

export default UserBadges
