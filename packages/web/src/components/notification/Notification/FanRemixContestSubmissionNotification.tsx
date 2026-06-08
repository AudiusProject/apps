import { useCallback } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import { FanRemixContestSubmissionNotification as FanRemixContestSubmissionNotificationType } from '@audius/common/store'
import { Flex, IconTrophy } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { TextLink } from 'components/link/TextLink'
import { push } from 'utils/navigation'
import { contestPage } from 'utils/route'

import { NotificationBody } from './components/NotificationBody'
import { NotificationFooter } from './components/NotificationFooter'
import { NotificationHeader } from './components/NotificationHeader'
import { NotificationTile } from './components/NotificationTile'
import { NotificationTitle } from './components/NotificationTitle'
import { UserNameLink } from './components/UserNameLink'

const messages = {
  title: 'New submission',
  forContest: ' for ',
  submittedTrack: ' submitted a track',
  fallbackWithSubmitter: ' submitted a track to a remix contest.',
  fallbackGeneric: 'A new submission was posted to a remix contest.'
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

  const canFullyRender = contestTrack && submissionTrack && submitter

  return (
    <NotificationTile
      notification={notification}
      onClick={submissionTrack ? handleClick : undefined}
    >
      <NotificationHeader icon={<IconTrophy color='accent' />}>
        <NotificationTitle>{messages.title}</NotificationTitle>
      </NotificationHeader>
      <Flex alignItems='flex-start'>
        <NotificationBody>
          {canFullyRender ? (
            <>
              <UserNameLink user={submitter} notification={notification} />
              {messages.submittedTrack}
              {messages.forContest}
              <TextLink
                css={{ display: 'inline' }}
                variant='secondary'
                size='l'
                to={contestPage(contestTrack.permalink)}
              >
                {contestTrack.title}
              </TextLink>
            </>
          ) : submitter ? (
            <>
              <UserNameLink user={submitter} notification={notification} />
              {messages.fallbackWithSubmitter}
            </>
          ) : (
            messages.fallbackGeneric
          )}
        </NotificationBody>
      </Flex>
      <NotificationFooter timeLabel={timeLabel} isViewed={isViewed} />
    </NotificationTile>
  )
}
