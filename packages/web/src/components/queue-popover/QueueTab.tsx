import {
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  useCallback,
  useContext,
  useMemo
} from 'react'

import {
  DragDropContext,
  Draggable,
  Droppable
} from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration'
import { useTrack, useUser } from '@audius/common/api'
import { Name, PlaybackSource, ID, ShareSource } from '@audius/common/models'
import {
  playbackActions,
  playbackSelectors,
  PlaybackTrack,
  shareModalUIActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Flex,
  PlainButton,
  PopupMenu,
  PopupMenuItem,
  Text
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { ToastContext } from 'components/toast/ToastContext'
import { push } from 'utils/navigation'

import { MiniTrackTile } from './MiniTrackTile'
import { getQuerySourceLabel } from './getQuerySourceLabel'
import { useNextFromSource } from './useNextFromSource'

const { profilePage } = route
const { getPlaybackQueue, getPlaybackIndex, getIsPlaying, getCurrentTrackId } =
  playbackSelectors
const {
  removeFromQueue,
  reorder,
  clearUpcoming,
  playTrackAt,
  addToQueue,
  playNext,
  togglePlay
} = playbackActions
const { requestOpen: requestOpenShareModal } = shareModalUIActions

const messages = {
  nowPlaying: 'Now playing',
  nextInQueue: 'Next in Queue',
  clear: 'Clear',
  nextFrom: 'Next from: ',
  emptyQueue: 'Your queue is empty.',
  emptyQueueHint: 'Play a track to get started.'
}

type DropResult = {
  source: { droppableId: string; index: number }
  destination: { droppableId: string; index: number } | null
  reason: 'DROP' | 'CANCEL'
}

type DroppableProvided = {
  innerRef: (element: HTMLElement | null) => void
  droppableProps: Record<string, string>
  placeholder: ReactElement | null
}

type DraggableProvided = {
  innerRef: (element: HTMLElement | null) => void
  draggableProps: HTMLAttributes<HTMLElement> & { style?: CSSProperties }
  dragHandleProps: HTMLAttributes<HTMLElement> | null
}

type DraggableStateSnapshot = {
  isDragging: boolean
  isDropAnimating?: boolean
}

const trackKey = (t: PlaybackTrack, index: number) =>
  t.uid ? `${t.uid}` : `${t.trackId}-${index}`

type QueueRowProps = {
  trackId: ID
  isPlaying: boolean
  isActive: boolean
  onPlay: () => void
  onRemove?: () => void
  showHoverActions?: boolean
  showGrip?: boolean
  onClose: () => void
}

const QueueRow = ({
  trackId,
  isPlaying,
  isActive,
  onPlay,
  onRemove,
  showHoverActions = true,
  showGrip = false,
  onClose
}: QueueRowProps) => {
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
    dispatch(playNext({ track: { trackId, source: 'queue-popover' } }))
    toast('Will play next')
  }, [dispatch, trackId, toast])

  const handleAddToQueue = useCallback(() => {
    dispatch(addToQueue({ tracks: [{ trackId, source: 'queue-popover' }] }))
    toast('Added to queue')
  }, [dispatch, trackId, toast])

  const items: PopupMenuItem[] = []
  // Items not already in the queue (no onRemove) get queueing options.
  if (!onRemove) {
    items.push({ text: 'Play Next', onClick: handlePlayNext })
    items.push({ text: 'Add to Queue', onClick: handleAddToQueue })
  }
  items.push({ text: 'Visit Track Page', onClick: goToTrack })
  items.push({ text: 'Visit Artist Page', onClick: goToArtist })
  items.push({ text: 'Share', onClick: handleShare })
  if (onRemove) {
    items.push({ text: 'Remove from Queue', onClick: onRemove })
  }

  return (
    <PopupMenu
      items={items}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      zIndex={20001}
      renderTrigger={(anchorRef, triggerPopup) => (
        <div ref={anchorRef as any} style={{ width: '100%' }}>
          <MiniTrackTile
            trackId={trackId}
            isPlaying={isPlaying}
            isActive={isActive}
            onPlay={onPlay}
            onRemove={onRemove}
            onMore={(el) => {
              ;(anchorRef as any).current = el
              triggerPopup()
            }}
            onTitleClick={goToTrack}
            showHoverActions={showHoverActions}
            showGrip={showGrip}
          />
        </div>
      )}
    />
  )
}

type QueueTabProps = {
  onClose: () => void
}

export const QueueTab = ({ onClose }: QueueTabProps) => {
  const dispatch = useDispatch()
  const queue = useSelector(getPlaybackQueue)
  const index = useSelector(getPlaybackIndex)
  const isPlaying = useSelector(getIsPlaying)
  const currentTrackId = useSelector(getCurrentTrackId)
  const { trackIds: nextFromIds, sourceKey } = useNextFromSource()

  const nowPlaying = index >= 0 && index < queue.length ? queue[index] : null
  const nextInQueue = useMemo(
    () => (index >= 0 ? queue.slice(index + 1) : queue.length > 0 ? queue : []),
    [queue, index]
  )
  const nextInQueueStart = index >= 0 ? index + 1 : 0

  const handlePlayCurrent = useCallback(() => {
    if (!nowPlaying) return
    dispatch(togglePlay())
  }, [dispatch, nowPlaying])

  const handlePlayAt = useCallback(
    (queueIndex: number) => {
      dispatch(playTrackAt({ index: queueIndex }))
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id: queue[queueIndex]?.trackId ?? null,
          source: PlaybackSource.PLAYBAR
        })
      )
    },
    [dispatch, queue]
  )

  const handleRemove = useCallback(
    (queueIndex: number) => {
      dispatch(removeFromQueue({ index: queueIndex }))
    },
    [dispatch]
  )

  const handleClear = useCallback(() => {
    dispatch(clearUpcoming())
  }, [dispatch])

  const handlePlayNext = useCallback(
    (trackId: ID) => {
      const sourceTag = String(sourceKey ?? 'next-from')
      dispatch(
        addToQueue({
          tracks: [{ trackId, source: sourceTag }],
          index: nextInQueueStart
        })
      )
    },
    [dispatch, nextInQueueStart, sourceKey]
  )

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return
      const sourceIndex = nextInQueueStart + result.source.index
      const destIndex = nextInQueueStart + result.destination.index
      if (sourceIndex === destIndex) return
      const orderedUids = queue
        .map((t, i) => ({ uid: t.uid, i }))
        .filter((e): e is { uid: string; i: number } => !!e.uid)
        .map((e) => e.uid)
      // Build new order: identify uid order excluding the moved item, then
      // insert it at the destination relative position.
      const tailUids = nextInQueue
        .map((t) => t.uid)
        .filter((uid): uid is string => !!uid)
      if (tailUids.length !== nextInQueue.length) {
        // Some items lack a uid — fall back to no-op (shouldn't happen in practice).
        return
      }
      const moved = tailUids.splice(result.source.index, 1)[0]
      tailUids.splice(result.destination.index, 0, moved)
      const headUids = orderedUids.slice(
        0,
        Math.max(0, orderedUids.length - nextInQueue.length)
      )
      dispatch(reorder({ orderedUids: [...headUids, ...tailUids] }))
    },
    [dispatch, nextInQueueStart, queue, nextInQueue]
  )

  if (queue.length === 0) {
    return (
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='s'
        ph='l'
        pv='2xl'
      >
        <Text variant='body' size='m' color='subdued'>
          {messages.emptyQueue}
        </Text>
        <Text variant='body' size='s' color='subdued'>
          {messages.emptyQueueHint}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction='column' gap='l' w='100%'>
      {nowPlaying ? (
        <Flex direction='column' gap='s' w='100%'>
          <Flex ph='s' alignItems='center'>
            <Text variant='title' size='m' strength='default' color='default'>
              {messages.nowPlaying}
            </Text>
          </Flex>
          <QueueRow
            trackId={nowPlaying.trackId}
            isPlaying={isPlaying}
            isActive={currentTrackId === nowPlaying.trackId}
            onPlay={handlePlayCurrent}
            showHoverActions={false}
            onClose={onClose}
          />
        </Flex>
      ) : null}

      {nextInQueue.length > 0 ? (
        <Flex direction='column' gap='s' w='100%'>
          <Flex
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            ph='s'
          >
            <Text variant='title' size='m' strength='default' color='default'>
              {messages.nextInQueue}
            </Text>
            <PlainButton onClick={handleClear}>{messages.clear}</PlainButton>
          </Flex>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId='queue-next'>
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ width: '100%' }}
                >
                  {nextInQueue.map((track, i) => {
                    const queueIndex = nextInQueueStart + i
                    const id = trackKey(track, queueIndex)
                    return (
                      <Draggable key={id} draggableId={id} index={i}>
                        {(
                          provided: DraggableProvided,
                          snapshot: DraggableStateSnapshot
                        ) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...(provided.dragHandleProps ?? {})}
                            role='listitem'
                            style={{
                              ...(provided.draggableProps.style as
                                | CSSProperties
                                | undefined),
                              opacity: snapshot.isDragging ? 0.4 : 1
                            }}
                          >
                            <QueueRow
                              trackId={track.trackId}
                              isPlaying={false}
                              isActive={false}
                              onPlay={() => handlePlayAt(queueIndex)}
                              onRemove={() => handleRemove(queueIndex)}
                              showGrip
                              onClose={onClose}
                            />
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </Flex>
      ) : null}

      {nextFromIds.length > 0 ? (
        <Flex direction='column' gap='s' w='100%'>
          <Flex ph='s'>
            <Text
              variant='title'
              size='m'
              strength='default'
              color='default'
              ellipses
            >
              {messages.nextFrom}
              <Text color='accent'>{getQuerySourceLabel(sourceKey)}</Text>
            </Text>
          </Flex>
          <Flex direction='column' w='100%'>
            {nextFromIds.map((trackId) => (
              <NextFromRow
                key={trackId}
                trackId={trackId}
                onPlayNext={() => handlePlayNext(trackId)}
                onClose={onClose}
              />
            ))}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}

type NextFromRowProps = {
  trackId: ID
  onPlayNext: () => void
  onClose: () => void
}

const NextFromRow = ({ trackId, onPlayNext, onClose }: NextFromRowProps) => {
  return (
    <QueueRow
      trackId={trackId}
      isPlaying={false}
      isActive={false}
      onPlay={onPlayNext}
      showHoverActions
      onClose={onClose}
    />
  )
}
