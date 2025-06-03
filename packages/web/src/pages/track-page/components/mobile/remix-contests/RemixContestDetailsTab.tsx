import { useRemixContest } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { UPLOAD_PAGE } from '@audius/common/src/utils/route'
import { dayjs } from '@audius/common/utils'
import { Button, Divider, Flex, IconCloudUpload, Text } from '@audius/harmony'

import { UserGeneratedText } from 'components/user-generated-text'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'

const messages = {
  due: 'Submission Due:',
  deadline: (deadline?: string) => {
    if (!deadline) return ''
    const date = dayjs(deadline)
    return `${date.format('MM/DD/YY')} at ${date.format('h:mm A')}`
  },
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
  const navigate = useNavigateToPage()
  const { data: remixContest } = useRemixContest(trackId)
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())

  const goToUploadWithRemix = useRequiresAccountCallback(() => {
    if (!trackId) return

    const state = {
      initialMetadata: {
        is_remix: true,
        remix_of: {
          tracks: [{ parent_track_id: trackId }]
        }
      }
    }
    navigate(UPLOAD_PAGE, state)
  }, [trackId, navigate])

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
      {!isOwner ? (
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
