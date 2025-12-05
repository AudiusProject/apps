import type { RefObject } from 'react'

import { useRemixContest } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { dayjs, formatContestDeadline } from '@audius/common/utils'
import type { ScrollView, FlatList } from 'react-native/types'

import { Flex, Text } from '@audius/harmony-native'
import { ExpandableContent, UserGeneratedText } from 'app/components/core'

const messages = {
  due: 'Submission Due:',
  ended: 'Contest Ended:',
  deadline: (deadline?: string) => formatContestDeadline(deadline, 'long'),
  fallbackDescription:
    'Enter my remix contest before the deadline for your chance to win!'
}

type Props = {
  trackId: ID
  scrollRef?: RefObject<ScrollView | FlatList | null>
}

/**
 * Tab content displaying details about a remix contest
 */
export const RemixContestDetailsTab = ({ trackId, scrollRef }: Props) => {
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
      <ExpandableContent scrollRef={scrollRef}>
        <UserGeneratedText variant='body'>
          {remixContest.eventData?.description ?? messages.fallbackDescription}
        </UserGeneratedText>
      </ExpandableContent>
    </Flex>
  )
}
