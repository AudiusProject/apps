import { cloneElement, useCallback } from 'react'

import { BadgeTier } from '@audius/common/src/models/BadgeTier'
import { ID } from '@audius/common/src/models/Identifiers'
import { useTierAndVerifiedForUser } from '@audius/common/src/store'
import { setVisibility } from '@audius/common/src/store/ui/modals/parentSlice'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { audioTierMap } from 'components/user-badges/UserBadges'

import styles from './ProfilePageBadge.module.css'

type ProfilePageBadgeProps = {
  userId: ID
  className?: string
  isCompact?: boolean
}

const messages = {
  tier: 'TIER'
}

const tierGradientMap: { [tier in BadgeTier]: any } = {
  none: {},
  bronze: {
    backgroundBlendMode: 'multiply, screen',
    backgroundImage:
      'linear-gradient(131.84deg, rgba(141, 48, 8, 0.5) 12.86%, rgba(255, 224, 210, 0.234375) 80.02%), linear-gradient(136.33deg, rgba(255, 255, 255, 0.24) 9.6%, rgba(255, 255, 255, 0) 95.26%)',
    backgroundColor: 'rgba(182, 97, 11, 1)'
  },
  silver: {
    backgroundBlendMode: 'multiply, screen',
    backgroundImage:
      'linear-gradient(131.84deg, rgba(179, 182, 185, 0.5) 12.86%, rgba(210, 226, 255, 0.234375) 80.02%), linear-gradient(136.33deg, rgba(255, 255, 255, 0.24) 9.6%, rgba(255, 255, 255, 0) 95.26%)',
    backgroundColor: 'rgba(189, 189, 189, 1)'
  },
  gold: {
    backgroundImage:
      'linear-gradient(131.84deg, rgba(231, 154, 7, 0.5) 12.86%, rgba(250, 255, 0, 0.234375) 80.02%) linear-gradient(136.33deg, rgba(255, 255, 255, 0.24) 9.6%, rgba(255, 255, 255, 0) 95.26%)',
    backgroundColor: 'rgba(236, 173, 11, 1)'
  },
  platinum: {
    backgroundImage: 'linear-gradient(135deg, #B3ECF9 4.17%, #57C2D7 95.83%)'
  }
}

/** Just the name of the badge, in a nice gradient.  Used in a few places. */
export const BadgeTierText = ({
  tier,
  fontSize,
  className
}: {
  tier: BadgeTier
  fontSize: number
  className?: string
}) => {
  return (
    <span
      className={cn(styles.tierText, className)}
      style={{ ...tierGradientMap[tier], fontSize }}
    >
      {tier}
    </span>
  )
}

/**
 * Badge with additional info that lives on a profile page.
 * shows the badge icon as was as the name of the tier.
 */
const ProfilePageBadge = ({
  userId,
  className,
  isCompact
}: ProfilePageBadgeProps) => {
  const { tier, tierNumber } = useTierAndVerifiedForUser(userId)

  const dispatch = useDispatch()
  const onClick = useCallback(() => {
    dispatch(setVisibility({ modal: 'TiersExplainer', visible: true }))
  }, [dispatch])

  if (tier === 'none') return null

  const badge = audioTierMap[tier as BadgeTier]
  if (!badge) return null
  // @ts-ignore
  const badgeWithSize = cloneElement(badge, { size: '3xl' })

  return (
    <div
      className={cn(
        styles.container,
        { [styles.isCompact]: isCompact },
        className
      )}
      onClick={onClick}
    >
      {badgeWithSize}
      {!isCompact && <div className={styles.divider} />}
      <div className={styles.text}>
        <span
          className={styles.tierNumber}
        >{`${messages.tier} ${tierNumber}`}</span>
        <BadgeTierText
          tier={tier}
          fontSize={22}
          className={styles.tierTextContainer}
        />
      </div>
    </div>
  )
}
export default ProfilePageBadge
