import { useMemo } from 'react'

import { useProfileUser } from '@audius/common/api'
import { useProxySelector } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import {
  profilePageTracksLineupActions as tracksActions,
  profilePageSelectors
} from '@audius/common/store'

import { Lineup } from 'app/components/lineup'

import { EmptyProfileTile } from '../EmptyProfileTile'

const { getProfileTracksLineup } = profilePageSelectors

export const TracksTab = () => {
  const {
    handle,
    user_id,
    track_count = 0,
    artist_pick_track_id
  } = useProfileUser({
    select: (user) => ({
      handle: user.handle,
      user_id: user.user_id,
      track_count: user.track_count,
      artist_pick_track_id: user.artist_pick_track_id
    })
  }).user ?? {}

  const handleLower = handle?.toLowerCase()

  const lineup = useProxySelector(
    (state) => getProfileTracksLineup(state, handleLower),
    [handleLower]
  )

  const fetchPayload = useMemo(() => ({ userId: user_id }), [user_id])
  const extraFetchOptions = useMemo(() => ({ handle }), [handle])

  // `selfLoad` fired with an undefined handle makes the saga return [],
  // which poisons `hasMore` and leaves the tab stuck on the empty state.
  const canSelfLoad = !!handleLower
  const canShowEmptyTile = track_count === 0 || lineup.status !== Status.IDLE

  return (
    <Lineup
      selfLoad={canSelfLoad}
      pullToRefresh
      leadingElementId={artist_pick_track_id}
      showArtistPick={true}
      actions={tracksActions}
      lineup={lineup}
      fetchPayload={fetchPayload}
      extraFetchOptions={extraFetchOptions}
      disableTopTabScroll
      LineupEmptyComponent={
        canShowEmptyTile ? <EmptyProfileTile tab='tracks' /> : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  )
}
