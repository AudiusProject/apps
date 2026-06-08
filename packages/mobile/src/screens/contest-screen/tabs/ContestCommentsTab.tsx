import { useCallback } from 'react'

import { Flex } from '@audius/harmony-native'
import { FlatList } from 'app/components/core'

import { ContestCommentsList } from '../ContestCommentsList'
import { useContestPage } from '../ContestPageContext'

/**
 * Comments body — community comments + replies (everything except
 * host post-updates). Uses the same scroll/collapsible pattern as
 * the other tabs.
 */
export const ContestCommentsTab = () => {
  const { eventId, eventOwnerUserId } = useContestPage()

  const renderHeader = useCallback(
    () => (
      <Flex p='l'>
        <ContestCommentsList
          eventId={eventId}
          eventOwnerUserId={eventOwnerUserId}
          mode='comments'
        />
      </Flex>
    ),
    [eventId, eventOwnerUserId]
  )

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={renderHeader}
      keyExtractor={() => ''}
    />
  )
}
