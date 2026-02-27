import { useRemixContest } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { dayjs, formatContestDeadline } from '@audius/common/utils'

import { Flex, Text } from '@audius/harmony-native'
import { UserGeneratedText } from 'app/components/core'

const messages = {
  due: 'Submission Due:',
  ended: 'Contest Ended:',
  deadline: (deadline?: string) => formatContestDeadline(deadline, 'long'),
  fallbackDescription:
    'Enter my remix contest before the deadline for your chance to win!'
}

type Props = {
  trackId: ID
}

/**
 * Tab content displaying details about a remix contest
 */
export const RemixContestDetailsTab = ({ trackId }: Props) => {
  const { data: remixContest } = useRemixContest(trackId)

  if (!remixContest) return null

  const isContestEnded = dayjs(remixContest.endDate).isBefore(dayjs())

  return (
    <Flex column gap='s' p='xl' pb='2xl' borderTop='default'>
      <Flex row gap='s' wrap='wrap'>
        <Text variant='title' color='accent'>
          {isContestEnded ? messages.ended : messages.due}
        </Text>
        <Text variant='body' strength='strong'>
          {messages.deadline(remixContest.endDate)}
        </Text>
      </Flex>
      <UserGeneratedText variant='body'>
        {remixContest.eventData?.description ?? messages.fallbackDescription}
      </UserGeneratedText>
    </Flex>
  )
}
