import { useCallback } from 'react'

import {
  lineupSelectors,
  feedPageLineupActions as feedActions,
  feedPageSelectors
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Screen, ScreenContent } from 'app/components/core'
import { Lineup } from 'app/components/lineup'
import { EndOfLineupNotice } from 'app/components/lineup/EndOfLineupNotice'
import { OnlineOnly } from 'app/components/offline-placeholder/OnlineOnly'
import { SuggestedFollows } from 'app/components/suggested-follows'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'

import { FeedFilterButton } from './FeedFilterButton'
const { getDiscoverFeedLineup } = feedPageSelectors
const { makeGetLineupMetadatas } = lineupSelectors

const getFeedLineup = makeGetLineupMetadatas(getDiscoverFeedLineup)

const messages = {
  header: 'Your Feed',
  endOfFeed: "Looks like you've reached the end of your feed..."
}

export const FeedScreen = () => {
  useAppTabScreen()

  const dispatch = useDispatch()

  const loadMore = useCallback(
    (offset: number, limit: number, overwrite: boolean) => {
      dispatch(feedActions.fetchLineupMetadatas(offset, limit, overwrite))
    },
    [dispatch]
  )

  return (
    <Screen
      url='Feed'
      header={() => (
        <MobileRootHeader title={messages.header} showDivider={false}>
          <OnlineOnly>
            <FeedFilterButton />
          </OnlineOnly>
        </MobileRootHeader>
      )}
    >
      <ScreenContent>
        <Lineup
          pullToRefresh
          delineate
          selfLoad
          hideHeaderOnEmpty
          ListFooterComponent={
            <EndOfLineupNotice description={messages.endOfFeed} />
          }
          LineupEmptyComponent={<SuggestedFollows />}
          actions={feedActions}
          lineupSelector={getFeedLineup}
          loadMore={loadMore}
          showsVerticalScrollIndicator={false}
        />
      </ScreenContent>
    </Screen>
  )
}
