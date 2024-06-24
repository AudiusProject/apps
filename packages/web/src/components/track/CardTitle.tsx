import {
  isContentCollectibleGated,
  isContentUSDCPurchaseGated,
  AccessConditions
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Text,
  IconCart,
  IconCollectible,
  IconSpecialAccess
} from '@audius/harmony'
import cn from 'classnames'

import styles from './GiantTrackTile.module.css'

const messages = {
  trackTitle: 'TRACK',
  podcastTitle: 'PODCAST',
  remixTitle: 'REMIX',
  hiddenTrackTooltip: 'Anyone with a link to this page will be able to see it',
  collectibleGated: 'COLLECTIBLE GATED',
  specialAccess: 'SPECIAL ACCESS',
  premiumTrack: 'PREMIUM TRACK'
}

type CardTitleProps = {
  className?: string
  isUnlisted: boolean
  isScheduledRelease: boolean
  isRemix: boolean
  isStreamGated: boolean
  isPodcast: boolean
  streamConditions: Nullable<AccessConditions>
}

export const CardTitle = ({
  className,
  isScheduledRelease,
  isUnlisted,
  isRemix,
  isStreamGated,
  isPodcast,
  streamConditions
}: CardTitleProps) => {
  let content
  const extraStyles = []

  if (isStreamGated) {
    extraStyles.push(styles.gatedContent)
    let icon
    let message
    if (isContentCollectibleGated(streamConditions)) {
      icon = <IconCollectible />
      message = messages.collectibleGated
    } else if (isContentUSDCPurchaseGated(streamConditions)) {
      icon = <IconCart />
      message = messages.premiumTrack
    } else {
      icon = <IconSpecialAccess />
      message = messages.specialAccess
    }
    content = (
      <div className={cn(styles.typeLabel, styles.gatedContentLabel)}>
        {icon}
        {message}
      </div>
    )
  } else {
    content = (
      <div className={styles.typeLabel}>
        {isRemix
          ? messages.remixTitle
          : isPodcast
          ? messages.podcastTitle
          : messages.trackTitle}
      </div>
    )
  }

  return (
    <Text
      variant='title'
      strength='weak'
      className={cn(styles.headerContainer, className, ...extraStyles)}
    >
      {content}
    </Text>
  )
}
