import { useCallback } from 'react'

import { Flex } from '@audius/harmony-native'
import { FlatList } from 'app/components/core'

import { ContestCommentsList } from '../ContestCommentsList'
import { useContestPage } from '../ContestPageContext'

/**
 * Updates body — host-only post-updates feed. Renders as the
 * ListHeaderComponent of a core `FlatList` so the scroll coordinates
 * with the collapsible header on the parent screen.
 */
export const ContestUpdatesTab = () => {
  const { eventId, eventOwnerUserId } = useContestPage()

  const renderHeader = useCallback(
    () => (
      <Flex p='l'>
        <ContestCommentsList
          eventId={eventId}
          eventOwnerUserId={eventOwnerUserId}
          mode='updates'
          hideHeading
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
