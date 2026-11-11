import { useMemo } from 'react'

import {
  useProfileUser,
  useProfileReposts,
  getProfileRepostsQueryKey
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { TrackLineup } from 'app/components/lineup/TrackLineup'

import { EmptyProfileTile } from '../EmptyProfileTile'

export const RepostsTab = () => {
  const { isEnabled: isTrackRowsEnabled } = useFeatureFlag(
    FeatureFlags.TRACK_ROWS
  )
  const { handle, repost_count = 0 } =
    useProfileUser({
      select: (user) => ({
        handle: user.handle,
        user_id: user.user_id,
        repost_count: user.repost_count
      })
    }).user ?? {}

  const handleLower = handle?.toLowerCase() ?? ''

  const queryArgs = useMemo(() => ({ handle: handleLower }), [handleLower])

  const {
    data,
    trackIds,
    isPending,
    isFetching,
    hasNextPage,
    loadNextPage,
    refetch
  } = useProfileReposts(queryArgs, { enabled: !!handleLower })

  const querySource = useMemo(
    () => ({
      queryKey: [...getProfileRepostsQueryKey(queryArgs)] as unknown[]
    }),
    [queryArgs]
  )

  const canShowEmptyTile = repost_count === 0 || (!isPending && !isFetching)

  return (
    <TrackLineup
      tileVariant={isTrackRowsEnabled ? 'row' : 'tile'}
      trackIds={trackIds}
      lineupItems={data}
      source='PROFILE_FEED'
      querySource={querySource}
      isPending={isPending}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
      pullToRefresh
      refresh={() => {
        refetch()
      }}
      disableTopTabScroll
      LineupEmptyComponent={
        canShowEmptyTile ? <EmptyProfileTile tab='reposts' /> : undefined
      }
    />
  )
}
