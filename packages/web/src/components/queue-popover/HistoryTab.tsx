import { useCallback, useContext } from 'react'

import { useTrack, useTrackHistory, useUser } from '@audius/common/api'
import { Name, PlaybackSource, ID, ShareSource } from '@audius/common/models'
import {
  playbackActions,
  playbackSelectors,
  QueueSource,
  shareModalUIActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Flex,
  LoadingSpinner,
  PopupMenu,
  PopupMenuItem,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { ToastContext } from 'components/toast/ToastContext'
import { push } from 'utils/navigation'

import { MiniTrackTile } from './MiniTrackTile'

const { profilePage } = route
const { getCurrentTrackId, getIsPlaying } = playbackSelectors
const { playFrom, playNext, addToQueue } = playbackActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions

const messages = {
  empty: "You haven't played any tracks yet.",
  loading: 'Loading history…'
}

type HistoryRowProps = {
  trackId: ID
  isActive: boolean
  isPlaying: boolean
  onPlay: () => void
  onClose: () => void
}

const HistoryRow = ({
  trackId,
  isActive,
  isPlaying,
  onPlay,
  onClose
}: HistoryRowProps) => {
  const dispatch = useDispatch()
  const { toast } = useContext(ToastContext)
  const { data: trackInfo } = useTrack(trackId, {
    select: (t) => ({
      permalink: t?.permalink,
      ownerId: t?.owner_id
    })
  })
  const { data: artistInfo } = useUser(trackInfo?.ownerId, {
    select: (u) => ({ handle: u?.handle })
  })

  const goToTrack = useCallback(() => {
    if (trackInfo?.permalink) {
      dispatch(push(trackInfo.permalink))
      onClose()
    }
  }, [dispatch, trackInfo?.permalink, onClose])

  const goToArtist = useCallback(() => {
    if (artistInfo?.handle) {
      dispatch(push(profilePage(artistInfo.handle)))
      onClose()
    }
  }, [dispatch, artistInfo?.handle, onClose])

  const handleShare = useCallback(() => {
    dispatch(
      requestOpenShareModal({
        type: 'track',
        trackId,
        source: ShareSource.OVERFLOW
      })
    )
  }, [dispatch, trackId])

  const handlePlayNext = useCallback(() => {
    dispatch(
      playNext({
        track: { trackId, source: QueueSource.HISTORY_TRACKS }
      })
    )
    toast('Will play next')
  }, [dispatch, trackId, toast])

  const handleAddToQueue = useCallback(() => {
    dispatch(
      addToQueue({
        tracks: [{ trackId, source: QueueSource.HISTORY_TRACKS }]
      })
    )
    toast('Added to queue')
  }, [dispatch, trackId, toast])

  const items: PopupMenuItem[] = [
    { text: 'Play Next', onClick: handlePlayNext },
    { text: 'Add to Queue', onClick: handleAddToQueue },
    { text: 'Visit Track Page', onClick: goToTrack },
    { text: 'Visit Artist Page', onClick: goToArtist },
    { text: 'Share', onClick: handleShare }
  ]

  return (
    <PopupMenu
      items={items}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      zIndex={20001}
      renderTrigger={(anchorRef, triggerPopup) => (
        <div style={{ width: '100%' }}>
          <MiniTrackTile
            trackId={trackId}
            isPlaying={isPlaying}
            isActive={isActive}
            onPlay={onPlay}
            onMore={(el) => {
              ;(anchorRef as any).current = el
              triggerPopup()
            }}
            onTitleClick={goToTrack}
            showHoverActions
          />
        </div>
      )}
    />
  )
}

type HistoryTabProps = {
  onClose: () => void
}

export const HistoryTab = ({ onClose }: HistoryTabProps) => {
  const dispatch = useDispatch()
  const isPlaying = useSelector(getIsPlaying)
  const currentTrackId = useSelector(getCurrentTrackId)
  const { trackIds, isPending, isFetching } = useTrackHistory({ pageSize: 50 })
  const isLoading = isPending && isFetching

  const handlePlay = useCallback(
    (startIndex: number) => {
      const tracks = trackIds.map((trackId) => ({
        trackId,
        source: QueueSource.HISTORY_TRACKS
      }))
      dispatch(playFrom({ tracks, startIndex, querySource: null }))
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id: trackIds[startIndex] ?? null,
          source: PlaybackSource.PLAYBAR
        })
      )
    },
    [dispatch, trackIds]
  )

  if (isLoading) {
    return (
      <Flex justifyContent='center' pv='2xl'>
        <LoadingSpinner />
      </Flex>
    )
  }

  if (trackIds.length === 0) {
    return (
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        pv='2xl'
        ph='l'
      >
        <Text variant='body' size='m' color='subdued'>
          {messages.empty}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction='column' w='100%'>
      {trackIds.map((trackId, i) => (
        <HistoryRow
          key={`${trackId}-${i}`}
          trackId={trackId}
          isActive={currentTrackId === trackId}
          isPlaying={isPlaying && currentTrackId === trackId}
          onPlay={() => handlePlay(i)}
          onClose={onClose}
        />
      ))}
    </Flex>
  )
}
