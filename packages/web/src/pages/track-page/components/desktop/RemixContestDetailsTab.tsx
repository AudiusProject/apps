import { useRemixContest } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import { Flex, spacing, Text } from '@audius/harmony'

import { CollapsibleContent } from 'components/collapsible-content'
import { UserGeneratedText } from 'components/user-generated-text'

const messages = {
  due: 'Submission Due:',
  deadline: (deadline?: string) => formatContestDeadline(deadline, 'long'),
  ended: 'Contest Ended:',
  fallbackDescription:
    'Enter my remix contest before the deadline for your chance to win!'
}

type RemixContestDetailsTabProps = {
  trackId: ID
  onHeightChange?: (height: number) => void
}

// 10 lines of text
const COLLAPSED_HEIGHT = 10 * spacing.m

/**
 * Tab content displaying details about a remix contest
 */
export const RemixContestDetailsTab = ({
  trackId,
  onHeightChange
}: RemixContestDetailsTabProps) => {
  const { data: remixContest } = useRemixContest(trackId)
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())

  return (
    <Flex column gap='l' p='xl'>
      <Flex row gap='s'>
        <Text variant='label' size='m' color='subdued'>
          {isContestEnded ? messages.ended : messages.due}
        </Text>
        <Text variant='body'>{messages.deadline(remixContest?.endDate)}</Text>
      </Flex>
      <CollapsibleContent
        id='remix-contest-details-tab'
        collapsedHeight={COLLAPSED_HEIGHT}
        onHeightChange={onHeightChange}
      >
        <UserGeneratedText variant='body'>
          {remixContest?.eventData?.description ?? messages.fallbackDescription}
        </UserGeneratedText>
      </CollapsibleContent>
    </Flex>
  )
}
