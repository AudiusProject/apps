import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import type { FanRemixContestSubmissionNotification as FanRemixContestSubmissionNotificationType } from '@audius/common/store'

import { IconTrophy } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import {
  NotificationHeader,
  NotificationText,
  NotificationTile,
  NotificationTitle,
  EntityLink,
  UserNameLink
} from '../Notification'

const messages = {
  title: 'New submission',
  description2: ' for '
}

type FanRemixContestSubmissionNotificationProps = {
  notification: FanRemixContestSubmissionNotificationType
}

export const FanRemixContestSubmissionNotification = (
  props: FanRemixContestSubmissionNotificationProps
) => {
  const { notification } = props
  const { userIds, entityId, submissionTrackId } = notification
  const submitterId = userIds[0]

  const navigation = useNavigation()
  const { data: submitter } = useUser(submitterId)
  const { data: contestTrack } = useTrack(entityId)
  const { data: submissionTrack } = useTrack(submissionTrackId)

  const handlePress = useCallback(() => {
    if (submissionTrack) {
      navigation.push('Track', {
        trackId: submissionTrack.track_id
      })
    }
  }, [submissionTrack, navigation])

  if (!submitter || !contestTrack || !submissionTrack) return null

  return (
    <NotificationTile notification={notification} onPress={handlePress}>
      <NotificationHeader icon={IconTrophy}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <NotificationText>
        <UserNameLink user={submitter} /> submitted a track
        {messages.description2}
        <EntityLink entity={contestTrack} />
      </NotificationText>
    </NotificationTile>
  )
}
