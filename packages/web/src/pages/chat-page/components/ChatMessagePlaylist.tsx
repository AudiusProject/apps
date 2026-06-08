import { useCallback, useMemo, useEffect } from 'react'

import {
  getCollectionByPermalinkQueryKey,
  useCollection,
  useCollectionByPermalink,
  useTracks
} from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import { Name, ModalSource } from '@audius/common/models'
import { QueueSource, ChatMessageTileProps } from '@audius/common/store'
import { getPathFromPlaylistUrl } from '@audius/common/utils'
import { useQuery } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTileSize } from 'components/track/types'

import { ChatUnfurlSkeleton } from './ChatUnfurlSkeleton'

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

  // Subscribe to the permalink-lookup query directly. `useCollectionByPermalink`
  // chains permalink → collection and returns the inner `useCollection`'s
  // pending state, which stays `true` forever when the permalink resolves
  // to no collection (the inner query is just disabled). Reading the
  // permalink query state directly lets us distinguish "still resolving"
  // from "resolved with no collection" so the skeleton terminates correctly.
  const { data: collectionIdFromPermalink, isPending: isPermalinkPending } =
    useQuery<number | null | undefined>({
      queryKey: getCollectionByPermalinkQueryKey(permalink),
      enabled: false
    })
  const hasCollectionId =
    !isPermalinkPending && collectionIdFromPermalink != null
  const isPending = isPermalinkPending || (hasCollectionId && !collection)

  const trackIds =
    playlist?.playlist_contents?.track_ids?.map((t) => t.track) ?? []
  const { data: tracks } = useTracks(trackIds)

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
  const hasResolvedCollection = !isPending && collectionExists

  useEffect(() => {
    // Defer firing parent callbacks while the permalink query is still
    // resolving so the URL text doesn't flash before the tile or empty state.
    if (isPending) return
    if (hasResolvedCollection) {
      dispatch(make(Name.MESSAGE_UNFURL_PLAYLIST, {}))
      onSuccess?.()
    } else {
      // Collection URL resolved to nothing playable (deleted or missing) —
      // signal empty so the bubble falls back to bare URL text rather than
      // showing a misleading or generic preview.
      onEmpty?.()
    }
  }, [isPending, hasResolvedCollection, onSuccess, onEmpty, dispatch])

  if (isPending) {
    return <ChatUnfurlSkeleton className={className} />
  }

  if (hasResolvedCollection && collectionId) {
    // You may wonder why we use the mobile web playlist tile here.
    // It's simply because the chat playlist tile uses the same design as mobile web.
    return (
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
        isLoading={false}
        isTrending={false}
        variant='readonly'
        source={ModalSource.DirectMessageCollectionTile}
      />
    )
  }

  return null
}
