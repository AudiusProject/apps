import { useRemixContest } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import { Button, Divider, Flex, IconCloudUpload, Text } from '@audius/harmony'

import { UserGeneratedText } from 'components/user-generated-text'
import { useEnterContest } from 'pages/contest-page/hooks/useEnterContest'

const messages = {
  due: 'Submission Due:',
  deadline: (deadline?: string) => formatContestDeadline(deadline, 'card'),
  ended: 'Contest Ended:',
  fallbackDescription:
    'Enter my remix contest before the deadline for your chance to win!',
  uploadRemixButtonText: 'Upload Your Remix'
}

type RemixContestDetailsTabProps = {
  trackId: ID
  isOwner: boolean
}

/**
 * Tab content displaying details about a remix contest
 */
export const RemixContestDetailsTab = ({
  trackId,
  isOwner
}: RemixContestDetailsTabProps) => {
  const { data: remixContest } = useRemixContest(trackId)
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())

  // Shared entry-point hook: pre-fills artwork + genre + remix_of from
  // the source track so the submitter doesn't have to re-supply them.
  const goToUploadWithRemix = useEnterContest(trackId)

  return (
    <Flex column w='100%'>
      <Flex column gap='s' p='l'>
        <Flex row gap='xs' wrap='wrap'>
          <Text variant='title' color='accent'>
            {isContestEnded ? messages.ended : messages.due}
          </Text>
          <Text variant='body' strength='strong'>
            {messages.deadline(remixContest?.endDate)}
          </Text>
        </Flex>
        <UserGeneratedText variant='body'>
          {remixContest?.eventData?.description ?? messages.fallbackDescription}
        </UserGeneratedText>
      </Flex>
      {!isOwner && !isContestEnded ? (
        <>
          <Divider />
          <Flex p='l' pb='s'>
            <Button
              variant='secondary'
              size='small'
              fullWidth
              onClick={goToUploadWithRemix}
              iconLeft={IconCloudUpload}
            >
              {messages.uploadRemixButtonText}
            </Button>
          </Flex>
        </>
      ) : null}
    </Flex>
  )
}
