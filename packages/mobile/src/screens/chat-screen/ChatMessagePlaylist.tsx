import { useCallback, useMemo, useEffect } from 'react'

import {
  useCollectionByPermalink,
  useTracks,
  useUsers
} from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import type { TrackPlayback } from '@audius/common/hooks'
import { Name, PlaybackSource, Kind } from '@audius/common/models'
import type { ID } from '@audius/common/models'
import { QueueSource, playbackSelectors } from '@audius/common/store'
import type { ChatMessageTileProps } from '@audius/common/store'
import { getPathFromPlaylistUrl, makeUid } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import { CollectionTile } from 'app/components/lineup-tile'
import { LineupTileSource } from 'app/components/lineup-tile/types'
import { make, track as trackEvent } from 'app/services/analytics'

const { getPlaying, getTrackId } = playbackSelectors

export const ChatMessagePlaylist = ({
  link,
  onEmpty,
  onSuccess,
  styles
}: ChatMessageTileProps) => {
  const isPlaying = useSelector(getPlaying)
  const playingTrackId = useSelector(getTrackId)

  const permalink = getPathFromPlaylistUrl(link) ?? ''
  const { data: collection } = useCollectionByPermalink(permalink)

  const trackIds = collection?.trackIds ?? []
  const { data: tracks, isPending: isTracksPending } = useTracks(trackIds)
  const { byId: usersById, isPending: isUsersPending } = useUsers(
    tracks?.map((t) => t.owner_id)
  )

  const isLoading = isTracksPending || isUsersPending

  const collectionId = collection?.playlist_id

  const uid = useMemo(() => {
    return collectionId ? makeUid(Kind.COLLECTIONS, collectionId) : null
  }, [collectionId])

  const uidMap = useMemo(() => {
    return trackIds.reduce((result: { [id: ID]: string }, id) => {
      result[id] = makeUid(Kind.TRACKS, id)
      return result
    }, {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId])

  /**
   * Include uids for the tracks as those are used to play the tracks,
   * and also to determine which track is currently playing.
   * Also include the other properties to conform with the component.
   */
  const tracksWithUids = useMemo(() => {
    return (tracks || []).map((track) => ({
      ...track,
      user: usersById[track.owner_id],
      id: track.track_id,
      uid: uidMap[track.track_id]
    }))
  }, [tracks, uidMap, usersById])

  const entries = useMemo(() => {
    return (tracks || []).map((track) => ({
      id: track.track_id,
      source: QueueSource.CHAT_PLAYLIST_TRACKS
    }))
  }, [tracks])

  const isActive = tracksWithUids.find(
    (track) => track.track_id === playingTrackId
  )

  const recordAnalytics = useCallback(
    ({ name, id }: { name: TrackPlayback; id: ID }) => {
      trackEvent(
        make({
          eventName: name,
          id: `${id}`,
          source: PlaybackSource.CHAT_PLAYLIST_TRACK
        })
      )
    },
    []
  )

  const playTrack = usePlayTrack(recordAnalytics)
  const pauseTrack = usePauseTrack(recordAnalytics)

  const togglePlay = useCallback(() => {
    if (!isPlaying || !isActive) {
      if (isActive && playingTrackId != null) {
        playTrack({ id: playingTrackId, entries })
      } else {
        const trackId = tracksWithUids[0] ? tracksWithUids[0].track_id : null
        if (!trackId) return
        playTrack({ id: trackId, entries })
      }
    } else if (playingTrackId != null) {
      pauseTrack(playingTrackId)
    }
  }, [
    isPlaying,
    isActive,
    playingTrackId,
    entries,
    tracksWithUids,
    playTrack,
    pauseTrack
  ])

  const collectionExists = !!collection
  useEffect(() => {
    if (collectionExists && uid) {
      trackEvent(
        make({
          eventName: Name.MESSAGE_UNFURL_PLAYLIST
        })
      )
      onSuccess?.()
    } else {
      onEmpty?.()
    }
  }, [collectionExists, uid, onSuccess, onEmpty])

  return collectionId && uid && !isLoading ? (
    <CollectionTile
      index={0}
      id={collectionId}
      togglePlay={togglePlay}
      uid={uid}
      collection={collection}
      tracks={tracksWithUids}
      isTrending={false}
      style={styles}
      variant='readonly'
      source={LineupTileSource.DM_COLLECTION}
    />
  ) : null
}
