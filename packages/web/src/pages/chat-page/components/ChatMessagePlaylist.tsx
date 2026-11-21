import { useCallback, useMemo, useEffect } from 'react'

import {
  getCollectionByPermalinkQueryKey,
  useCollection,
  useCollectionByPermalink,
  useTracks
} from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import { ModalSource } from '@audius/common/models'
import { QueueSource, ChatMessageTileProps } from '@audius/common/store'
import { getPathFromPlaylistUrl } from '@audius/common/utils'
import { useQuery } from '@tanstack/react-query'

import { CollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTileSize } from 'components/track/types'

import { ChatUnfurlSkeleton } from './ChatUnfurlSkeleton'

export const ChatMessagePlaylist = ({
  link,
  onEmpty,
  onSuccess,
  className
}: ChatMessageTileProps) => {
  const permalink = getPathFromPlaylistUrl(link) ?? ''
  const { data: playlist } = useCollectionByPermalink(permalink)

  const collectionId = playlist?.playlist_id
  const { data: collection } = useCollection(collectionId)

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
    if (isPending) return
    if (hasResolvedCollection) {
      onSuccess?.()
    } else {
      onEmpty?.()
    }
  }, [isPending, hasResolvedCollection, onSuccess, onEmpty])

  if (isPending) {
    return <ChatUnfurlSkeleton className={className} />
  }

  if (hasResolvedCollection && collectionId) {
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
