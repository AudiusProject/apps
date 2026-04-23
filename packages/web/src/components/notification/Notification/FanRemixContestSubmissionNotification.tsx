import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import { FanRemixContestSubmissionNotification as FanRemixContestSubmissionNotificationType } from '@audius/common/store'
import { Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { TextLink } from 'components/link/TextLink'
import { push } from 'utils/navigation'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { UserNameLink } from './components/UserNameLink'

const messages = {
  title: 'New submission',
  forContest: ' for '
}

type FanRemixContestSubmissionNotificationProps = {
  notification: FanRemixContestSubmissionNotificationType
}

export const FanRemixContestSubmissionNotification = (
  props: FanRemixContestSubmissionNotificationProps
) => {
  const { notification } = props
  const { timeLabel, isViewed, userIds, entityId, submissionTrackId } =
    notification
  const dispatch = useDispatch()

  const submitterId = userIds[0]
  const { data: submitter } = useUser(submitterId)
  const { data: contestTrack } = useTrack(entityId)
  const { data: submissionTrack } = useTrack(submissionTrackId)

  const handleClick = useCallback(() => {
    if (submissionTrack) {
      dispatch(push(submissionTrack.permalink))
    }
  }, [submissionTrack, dispatch])

  if (!contestTrack || !submissionTrack || !submitter) return null

  return (
    <NotificationTile notification={notification} onClick={handleClick}>
      <NotificationHeader icon={<IconTrophy color='accent' />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <Flex alignItems='flex-start'>
        <NotificationBody>
          <UserNameLink user={submitter} notification={notification} />
          {' submitted a track'}
          {messages.forContest}
          <TextLink
            css={{ display: 'inline' }}
            variant='secondary'
            size='l'
            to={`${contestTrack.permalink}/contest`}
          >
            {contestTrack.title}
          </TextLink>
        </NotificationBody>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
