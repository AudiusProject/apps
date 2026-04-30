import { useCallback, useMemo, useEffect } from 'react'

import {
  useCollection,
  useCollectionByPermalink,
  useTracks,
  useUsers
} from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import { Name, Status, ModalSource } from '@audius/common/models'
import { QueueSource, ChatMessageTileProps } from '@audius/common/store'
import { getPathFromPlaylistUrl } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTileSize } from 'components/track/types'

export const ChatMessagePlaylist = ({
  link,
  onEmpty,
  onSuccess,
  className
}: ChatMessageTileProps) => {
  const dispatch = useDispatch()

  const permalink = getPathFromPlaylistUrl(link) ?? ''
  const { data: playlist } = useCollectionByPermalink(permalink)

  const collectionId = playlist?.playlist_id
  const { data: collection } = useCollection(collectionId)

  const trackIds =
    playlist?.playlist_contents?.track_ids?.map((t) => t.track) ?? []
  const { data: tracks } = useTracks(trackIds)
  const { byId: usersById } = useUsers(tracks?.map((t) => t.owner_id))

  /**
   * Build the queueable entries for chat playback.
   */
  const tracksWithUsers = useMemo(() => {
    return (tracks || []).map((track) => ({
      ...track,
      user: usersById[track.owner_id],
      id: track.track_id
    }))
  }, [tracks, usersById])

  const entries = useMemo(() => {
    return (tracks || []).map((track) => ({
      id: track.track_id,
      source: QueueSource.CHAT_PLAYLIST_TRACKS
    }))
  }, [tracks])

  const play = usePlayTrack()
  const playTrack = useCallback(
    (id: number) => {
      play({ id, entries })
    },
    [play, entries]
  )

  const pauseTrack = usePauseTrack()

  const collectionExists = !!collection && !collection.is_delete
  useEffect(() => {
    if (collectionExists) {
      dispatch(make(Name.MESSAGE_UNFURL_PLAYLIST, {}))
      onSuccess?.()
    } else {
      onEmpty?.()
    }
  }, [collectionExists, onSuccess, onEmpty, dispatch])

  return collectionId ? (
    // You may wonder why we use the mobile web playlist tile here.
    // It's simply because the chat playlist tile uses the same design as mobile web.
    // @ts-ignore - collection tile accepts extra props
    <CollectionTile
      containerClassName={className}
      index={0}
      id={collectionId}
      size={TrackTileSize.SMALL}
      ordered={false}
      togglePlay={() => {}}
      playTrack={playTrack}
      pauseTrack={pauseTrack}
      hasLoaded={() => {}}
      isLoading={status === Status.LOADING || status === Status.IDLE}
      isTrending={false}
      numLoadingSkeletonRows={tracksWithUsers.length}
      variant='readonly'
      source={ModalSource.DirectMessageCollectionTile}
    />
  ) : null
}
