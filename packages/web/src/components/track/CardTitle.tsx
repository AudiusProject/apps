import {
  isContentUSDCPurchaseGated,
  AccessConditions,
  isContentTokenGated
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Text,
  IconCart,
  IconUserFollowing,
  Flex,
  IconFanClub
} from '@audius/harmony'

const messages = {
  trackTitle: 'TRACK',
  podcastTitle: 'PODCAST',
  remixTitle: 'REMIX',
  hiddenTrackTooltip: 'Anyone with a link to this page will be able to see it',
  coinGated: 'COIN GATED',
  followersOnly: 'FOLLOWERS ONLY',
  premiumTrack: 'PREMIUM TRACK',
  remixContest: 'REMIX CONTEST'
}

type CardTitleProps = {
  className?: string
  isUnlisted: boolean
  isScheduledRelease: boolean
  isRemix: boolean
  isStreamGated: boolean
  isPodcast: boolean
  streamConditions: Nullable<AccessConditions>
  isRemixContest: boolean
}

export const CardTitle = ({
  className,
  isRemix,
  isStreamGated,
  isPodcast,
  streamConditions,
  isRemixContest
}: CardTitleProps) => {
  let content

  if (isRemixContest) {
    content = (
      <Text variant='label' color='subdued'>
        {messages.remixContest}
      </Text>
    )
  } else if (isStreamGated) {
    let icon
    let message
    if (isContentUSDCPurchaseGated(streamConditions)) {
      icon = <IconCart size='s' color='subdued' />
      message = messages.premiumTrack
    } else if (isContentTokenGated(streamConditions)) {
      icon = <IconFanClub size='s' color='subdued' />
      message = messages.coinGated
    } else {
      icon = <IconUserFollowing size='s' color='subdued' />
      message = messages.followersOnly
    }
    content = (
      <Flex gap='s' alignItems='center' justifyContent='center'>
        {icon}
        <Text variant='label' color='subdued'>
          {message}
        </Text>
      </Flex>
    )
  } else {
    content = (
      <Text variant='label' color='subdued'>
        {isRemix
          ? messages.remixTitle
          : isPodcast
            ? messages.podcastTitle
            : messages.trackTitle}
      </Text>
    )
  }

  return (
    <Text variant='title' strength='weak' className={className}>
      {content}
    </Text>
  )
}
