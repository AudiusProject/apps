import { ComponentType, useCallback } from 'react'

import {
  getReactionFromRawValue,
  reactionOrder,
  ReactionTypes,
  useArtistCoin,
  useCurrentUserId,
  useReaction,
  useUser,
  useWriteReaction
} from '@audius/common/api'
import { useUIAudio } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import { TipReceiveNotification } from '@audius/common/store'

import { make } from 'common/store/analytics/actions'
import { XShareButton } from 'components/x-share-button/XShareButton'
import { env } from 'services/env'

import styles from './TipReceivedNotification.module.css'
import { AudioText } from './components/AudioText'
import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { ProfilePicture } from './components/ProfilePicture'
import { reactionMap, ReactionProps } from './components/Reaction'
import { UserNameLink } from './components/UserNameLink'
import { IconTip } from './components/icons'
import { useGoToProfile } from './useGoToProfile'

const reactionList: [ReactionTypes, ComponentType<ReactionProps>][] =
  reactionOrder.map((r) => [r, reactionMap[r]])

const messages = {
  title: 'You Received a Tip!',
  sent: 'sent you a tip of',
  audio: '$AUDIO',
  sayThanks: 'Say Thanks With a Reaction',
  reactionSent: 'Reaction Sent!',
  xShare: (senderHandle: string, amount: number, price?: string) => {
    const totalValue = price && amount ? Number(price) * amount : null
    return `Thanks ${senderHandle} for the ${amount} $AUDIO ${totalValue ? `(~$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })})` : ''} tip on @audius!`
  }
}

type TipReceivedNotificationProps = {
  notification: TipReceiveNotification
}

export const TipReceivedNotification = (
  props: TipReceivedNotificationProps
) => {
  const { notification } = props
  const {
    amount,
    timeLabel,
    isViewed,
    tipTxSignature,
    reactionValue: notificationReactionValue
  } = notification

  const { data: user } = useUser(notification.entityId)
  const { data: tokenPriceData } = useArtistCoin(env.WAUDIO_MINT_ADDRESS)

  const tokenPrice = tokenPriceData?.price?.toString()

  const { data: reaction } = useReaction(tipTxSignature, {
    // Only fetch if we don't have a reaction in the notification
    enabled: notificationReactionValue === null
  })

  // Use the reaction from the query, falling back to notification data
  const reactionValue =
    reaction?.reactionValue ??
    (notificationReactionValue
      ? getReactionFromRawValue(notificationReactionValue)
      : null)

  const { mutate: writeReaction } = useWriteReaction()
  const { data: currentUserId } = useCurrentUserId()

  const handleReaction = useCallback(
    (e: React.MouseEvent, reactionType: ReactionTypes) => {
      e.stopPropagation()
      if (!currentUserId) return
      writeReaction({
        entityId: tipTxSignature,
        reaction: reactionType,
        userId: currentUserId
      })
    },
    [tipTxSignature, writeReaction, currentUserId]
  )

  const uiAmount = useUIAudio(amount)

  const handleClick = useGoToProfile(user)

  const handleShare = useCallback(
    (senderHandle: string) => {
      const shareText = messages.xShare(senderHandle, uiAmount, tokenPrice)
      const analytics = make(
        Name.NOTIFICATIONS_CLICK_TIP_RECEIVED_TWITTER_SHARE,
        { text: shareText }
      )

      return { shareText, analytics }
    },
    [uiAmount, tokenPrice]
  )

  if (!user) return null

  return (
    <NotificationTile
      notification={notification}
      disableClosePanel
      onClick={handleClick}
    >
      <NotificationHeader icon={<IconTip />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationBody className={styles.body}>
        <div className={styles.bodyText}>
          <ProfilePicture className={styles.profilePicture} user={user} />
          <span>
            <UserNameLink user={user} notification={notification} />{' '}
            {messages.sent} <AudioText value={uiAmount} />
          </span>
        </div>
        <div className={styles.sayThanks}>
          {reactionValue ? (
            <>
              <i className='emoji small white-heavy-check-mark' />{' '}
              {messages.reactionSent}{' '}
            </>
          ) : (
            messages.sayThanks
          )}
        </div>
        <div className={styles.reactionList}>
          {reactionList.map(([reactionType, Reaction]) => (
            <Reaction
              key={reactionType}
              onClick={(e) => handleReaction(e, reactionType)}
              isActive={
                reactionValue // treat 0 and null equivalently here
                  ? reactionType === reactionValue
                  : undefined
              }
              isResponsive
            />
          ))}
        </div>
      </NotificationBody>
      <XShareButton
        type='dynamic'
        handle={user.handle}
        shareData={handleShare}
      />
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
