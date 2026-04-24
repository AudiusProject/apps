import { useMemo } from 'react'

import {
  useProfileUser,
  useProfileTracks,
  getProfileTracksQueryKey
} from '@audius/common/api'

import { TrackLineup } from 'app/components/lineup/TrackLineup'

import { EmptyProfileTile } from '../EmptyProfileTile'

export const TracksTab = () => {
  const { handle, track_count = 0 } =
    useProfileUser({
      select: (user) => ({
        handle: user.handle,
        user_id: user.user_id,
        track_count: user.track_count,
        artist_pick_track_id: user.artist_pick_track_id
      })
    }).user ?? {}

  const handleLower = handle?.toLowerCase() ?? ''

  const queryArgs = useMemo(() => ({ handle: handleLower }), [handleLower])

  const {
    trackIds,
    isPending,
    isFetching,
    hasNextPage,
    loadNextPage,
    refetch
  } = useProfileTracks(queryArgs, { enabled: !!handleLower })

  const querySource = useMemo(
    () => ({ queryKey: [...getProfileTracksQueryKey(queryArgs)] as unknown[] }),
    [queryArgs]
  )

  const canShowEmptyTile = track_count === 0 || (!isPending && !isFetching)

  return (
    <TrackLineup
      trackIds={trackIds}
      source='PROFILE_TRACKS'
      querySource={querySource}
      isPending={isPending}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
      pullToRefresh
      refresh={() => {
        refetch()
      }}
      showArtistPick
      disableTopTabScroll
      LineupEmptyComponent={
        canShowEmptyTile ? <EmptyProfileTile tab='tracks' /> : undefined
      }
    />
  )
}
