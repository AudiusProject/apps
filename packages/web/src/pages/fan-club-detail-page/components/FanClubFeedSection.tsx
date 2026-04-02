import { useCallback } from 'react'

import {
  useExclusiveTracks,
  useExclusiveTracksCount,
  useArtistCoin,
  useFanClubFeed,
  type FanClubFeedItem
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { exclusiveTracksPageLineupActions } from '@audius/common/store'
import { Button, Flex, LoadingSpinner, Text } from '@audius/harmony'

import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'

import { TextPostCard } from './TextPostCard'

const messages = {
  title: 'Fan Club Feed',
  loadMore: 'Load More'
}

const FEED_PAGE_SIZE = 10

type FanClubFeedSectionProps = {
  mint: string
}

export const FanClubFeedSection = ({ mint }: FanClubFeedSectionProps) => {
  const { data: coin } = useArtistCoin(mint)
  const ownerId = coin?.ownerId
  const { isEnabled: isTextPostsEnabled } = useFeatureFlag(
    FeatureFlags.FAN_CLUB_TEXT_POST_POSTING
  )

  // Exclusive tracks lineup
  const {
    data: tracksData,
    isFetching: isTracksFetching,
    isPending: isTracksPending,
    isError: isTracksError,
    hasNextPage: hasNextTracksPage,
    play,
    pause,
    loadNextPage: loadNextTracksPage,
    isPlaying,
    lineup,
    pageSize
  } = useExclusiveTracks({
    userId: ownerId,
    pageSize: FEED_PAGE_SIZE,
    initialPageSize: FEED_PAGE_SIZE
  })

  const { data: totalTrackCount = 0 } = useExclusiveTracksCount({
    userId: ownerId
  })

  // Fan club feed (text posts)
  const {
    data: feedItems,
    isPending: isFeedPending,
    hasNextPage: hasNextFeedPage,
    fetchNextPage: fetchNextFeedPage,
    isFetchingNextPage
  } = useFanClubFeed({
    mint,
    sortMethod: 'newest',
    pageSize: FEED_PAGE_SIZE,
    enabled: !!mint && isTextPostsEnabled
  })

  const textPosts = feedItems?.filter(
    (item): item is Extract<FanClubFeedItem, { itemType: 'text_post' }> =>
      item.itemType === 'text_post'
  )

  const handleLoadMoreFeed = useCallback(() => {
    if (hasNextFeedPage) {
      fetchNextFeedPage()
    }
  }, [hasNextFeedPage, fetchNextFeedPage])

  const hasTextPosts = textPosts && textPosts.length > 0
  const hasTracks = totalTrackCount > 0
  const shouldShowSection = hasTextPosts || hasTracks || !!ownerId

  if (!shouldShowSection) return null

  return (
    <Flex column gap='l' w='100%'>
      <Flex alignItems='center' gap='s' w='100%'>
        <Text variant='heading' size='m' color='default'>
          {messages.title}
        </Text>
      </Flex>

      {/* Text posts (feature-flagged) */}
      {!isTextPostsEnabled ? null : isFeedPending ? (
        <Flex justifyContent='center' pv='l'>
          <LoadingSpinner />
        </Flex>
      ) : hasTextPosts ? (
        <Flex column gap='m'>
          {textPosts.map((item) => (
            <TextPostCard
              key={item.commentId}
              commentId={item.commentId}
              mint={mint}
            />
          ))}
          {hasNextFeedPage ? (
            <Button
              variant='secondary'
              size='small'
              onClick={handleLoadMoreFeed}
              disabled={isFetchingNextPage}
            >
              {messages.loadMore}
            </Button>
          ) : null}
        </Flex>
      ) : null}

      {/* Exclusive tracks */}
      {hasTracks && ownerId ? (
        <TanQueryLineup
          data={tracksData}
          isFetching={isTracksFetching}
          isPending={isTracksPending}
          isError={isTracksError}
          hasNextPage={hasNextTracksPage}
          play={play}
          pause={pause}
          loadNextPage={loadNextTracksPage}
          isPlaying={isPlaying}
          lineup={lineup}
          actions={exclusiveTracksPageLineupActions}
          pageSize={pageSize}
          initialPageSize={FEED_PAGE_SIZE}
          variant={LineupVariant.MAIN}
          shouldLoadMore
        />
      ) : null}
    </Flex>
  )
}
