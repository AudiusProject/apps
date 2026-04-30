import { useCallback, useMemo, useEffect } from 'react'

import {
  getCollectionByPermalinkQueryKey,
  useCollection,
  useCollectionByPermalink,
  useTracks
} from '@audius/common/api'
import { usePlayTrack, usePauseTrack } from '@audius/common/hooks'
import { Name, Kind, ID, ModalSource } from '@audius/common/models'
import { QueueSource, ChatMessageTileProps } from '@audius/common/store'
import { getPathFromPlaylistUrl, makeUid } from '@audius/common/utils'
import { useQuery } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { CollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTileSize } from 'components/track/types'

import { ChatUnfurlSkeleton } from './ChatUnfurlSkeleton'
import { LinkPreview } from './LinkPreview'

export const ChatMessagePlaylist = ({
  link,
  chatId,
  messageId,
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

  const uid = useMemo(() => {
    return collectionId ? makeUid(Kind.COLLECTIONS, collectionId) : null
  }, [collectionId])

  const trackIds =
    playlist?.playlist_contents?.track_ids?.map((t) => t.track) ?? []
  const { data: tracks } = useTracks(trackIds)

  const uidMap = useMemo(() => {
    return trackIds.reduce((result: { [id: ID]: string }, id) => {
      result[id] = makeUid(Kind.TRACKS, id)
      return result
    }, {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId])

  const entries = useMemo(() => {
    return (tracks || []).map((track) => ({
      id: track.track_id,
      uid: uidMap[track.track_id],
      source: QueueSource.CHAT_PLAYLIST_TRACKS
    }))
  }, [tracks, uidMap])

  const play = usePlayTrack()
  const playTrack = useCallback(
    (uid: string) => {
      // Have to pass the uid bc the sagas cant get the lineup from the route in the ChatPage
      play({ uid, entries, passUid: true })
    },
    [play, entries]
  )

  const pauseTrack = usePauseTrack()

  const collectionExists = !!collection && !collection.is_delete
  const hasResolvedCollection = !isPending && collectionExists && !!uid

  useEffect(() => {
    // While the underlying collection query is still pending we don't yet
    // know whether the unfurl will resolve to a player or be empty — defer
    // firing the parent callbacks so the URL text doesn't flash before the
    // player.
    if (isPending) return
    if (hasResolvedCollection) {
      dispatch(make(Name.MESSAGE_UNFURL_PLAYLIST, {}))
      onSuccess?.()
    }
    // If the URL pattern-matches a playlist/album but no collection exists
    // (or it's deleted), fall through to LinkPreview below — LinkPreview
    // will fire its own onEmpty/onSuccess once OG metadata resolves.
  }, [isPending, hasResolvedCollection, onSuccess, dispatch])

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
        uid={uid}
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

  // URL looked like a playlist/album but resolved to nothing real — fall
  // back to a generic OG link preview so the bubble doesn't snap from
  // skeleton to bare URL text.
  return (
    <LinkPreview
      className={className}
      href={link}
      chatId={chatId}
      messageId={messageId}
      onEmpty={onEmpty}
      onSuccess={onSuccess}
    />
  )
}
