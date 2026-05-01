import { useCallback, useEffect } from 'react'

import {
  getTrackByPermalinkQueryKey,
  useTrackByPermalink
} from '@audius/common/api'
import {
  TrackPlayback,
  useGatedContentAccess,
  useToggleTrack
} from '@audius/common/hooks'
import {
  Name,
  PlaybackSource,
  ID,
  ModalSource
} from '@audius/common/models'
import { QueueSource, ChatMessageTileProps } from '@audius/common/store'
import { getPathFromTrackUrl } from '@audius/common/utils'
import { useQuery } from '@tanstack/react-query'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TrackTile } from 'components/track/mobile/TrackTile'
import { TrackTileSize } from 'components/track/types'

import { ChatUnfurlSkeleton } from './ChatUnfurlSkeleton'
import { LinkPreview } from './LinkPreview'

export const ChatMessageTrack = ({
  link,
  chatId,
  messageId,
  onEmpty,
  onSuccess,
  className
}: ChatMessageTileProps) => {
  const dispatch = useDispatch()
  const permalink = getPathFromTrackUrl(link)

  const { data: partialTrack } = useTrackByPermalink(permalink, {
    select: (track) =>
      pick(track, [
        'track_id',
        'is_delete',
        'is_stream_gated',
        'preview_cid',
        'access',
        'stream_conditions',
        'is_download_gated',
        'download_conditions'
      ])
  })
  const trackExists = !!partialTrack

  // Subscribe to the permalink-lookup query directly. `useTrackByPermalink`
  // chains permalink → track and returns the inner `useTrack(trackId)`'s
  // pending state, which stays `true` forever when the permalink resolves
  // to no track (the inner query is just disabled). Reading the permalink
  // query state directly lets us distinguish "still resolving" from
  // "resolved with no track" so the skeleton terminates correctly.
  const { data: trackIdFromPermalink, isPending: isPermalinkPending } =
    useQuery<number | null | undefined>({
      queryKey: getTrackByPermalinkQueryKey(permalink),
      enabled: false
    })
  const hasTrackId = !isPermalinkPending && trackIdFromPermalink != null
  const isPending = isPermalinkPending || (hasTrackId && !partialTrack)

  const { hasStreamAccess } = useGatedContentAccess(partialTrack)
  const { track_id, is_delete, is_stream_gated, preview_cid } =
    partialTrack ?? {}
  const isPreview = !!is_stream_gated && !!preview_cid && !hasStreamAccess

  const recordAnalytics = useCallback(
    ({ name, id }: { name: TrackPlayback; id: ID }) => {
      if (!trackExists) return
      dispatch(
        make(name, {
          id: `${id}`,
          source: PlaybackSource.CHAT_TRACK
        })
      )
    },
    [dispatch, trackExists]
  )

  const { togglePlay, isTrackPlaying } = useToggleTrack({
    id: track_id ?? null,
    isPreview,
    source: QueueSource.CHAT_TRACKS,
    recordAnalytics
  })

  const hasResolvedTrack = !isPending && trackExists && !is_delete

  useEffect(() => {
    // While the underlying track query is still pending we don't yet know
    // whether the unfurl will resolve to a player or be empty — defer firing
    // the parent callbacks so the URL text doesn't flash before the player.
    if (isPending) return
    if (hasResolvedTrack) {
      dispatch(make(Name.MESSAGE_UNFURL_TRACK, {}))
      onSuccess?.()
    }
    // If the URL pattern-matches a track but no track exists (or it's
    // deleted), fall through to LinkPreview below — LinkPreview will fire
    // its own onEmpty/onSuccess once OG metadata resolves.
  }, [isPending, hasResolvedTrack, onSuccess, dispatch])

  if (isPending) {
    return <ChatUnfurlSkeleton className={className} />
  }

  if (hasResolvedTrack && track_id) {
    // You may wonder why we use the mobile web track tile here.
    // It's simply because the chat track tile uses the same design as mobile web.
    return (
      <TrackTile
        containerClassName={className}
        index={0}
        id={track_id}
        size={TrackTileSize.SMALL}
        ordered={false}
        trackTileStyles={{}}
        togglePlay={togglePlay}
        hasLoaded={() => {}}
        isLoading={false}
        isTrending={false}
        isActive={isTrackPlaying}
        variant='readonly'
        source={ModalSource.DirectMessageTrackTile}
      />
    )
  }

  // URL looked like a track but resolved to nothing real — fall back to a
  // generic OG link preview so the bubble doesn't snap from skeleton to
  // bare URL text.
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
