import { memo, useCallback } from 'react'

import { ID, CoverArtSizes, AccessConditions } from '@audius/common/models'
import cn from 'classnames'
import { DragDropContext, Droppable, Draggable } from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration'
import { Nullable } from 'vitest'

import TrackListItem from './ConnectedTrackListItem'
import styles from './TrackList.module.css'
import { TrackItemAction } from './TrackListItem'

type TrackListProps = {
  containerClassName?: string
  itemClassName?: string
  tracks: Array<{
    isLoading: boolean
    isStreamGated?: boolean
    isUnlisted?: boolean
    isSaved?: boolean
    isReposted?: boolean
    isActive?: boolean
    isPlaying?: boolean
    isRemoveActive?: boolean
    trackTitle: string
    permalink: string
    trackId: ID
    uid?: string
    time?: number
    coverArtSizes?: CoverArtSizes
    isDeleted: boolean
    isLocked: boolean
    streamConditions?: Nullable<AccessConditions>
    hasStreamAccess?: boolean
  }>
  showTopDivider?: boolean
  showDivider?: boolean
  noDividerMargin?: boolean
  showBorder?: boolean
  onRemove?: (index: number) => void
  togglePlay?: (uid: string, trackId: ID) => void
  trackItemAction?: TrackItemAction
  isReorderable?: boolean
  onReorder?: (index1: number, index2: number) => void
}

const TrackList = ({
  containerClassName = '',
  itemClassName,
  tracks,
  onRemove,
  showTopDivider = false,
  showDivider = true,
  noDividerMargin,
  showBorder = false,
  togglePlay,
  trackItemAction,
  isReorderable = false,
  onReorder = () => {}
}: TrackListProps) => {
  const onDragEnd = useCallback(
    (result: any) => {
      const { source, destination } = result

      if (!source || !destination) return
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return
      onReorder(source.index, destination.index)
    },
    [onReorder]
  )

  // The dividers above and belove the active track should be hidden
  const activeIndex = tracks.findIndex((track) => track.isActive)
  const hideDivider = (idx: number) =>
    activeIndex >= 0 && (activeIndex === idx || activeIndex === idx - 1)

  const renderedTracks = tracks.map((track, idx) => {
    const listItem = (isDragging?: boolean) => (
      <div key={track.uid}>
        {showDivider && (showTopDivider || idx > 0) ? (
          <div
            className={cn(styles.divider, {
              [styles.hideDivider]: hideDivider(idx),
              [styles.noMargin]: noDividerMargin
            })}
          ></div>
        ) : null}
        <TrackListItem
          index={idx}
          trackId={track.trackId}
          className={itemClassName}
          isLoading={track.isLoading}
          isUnlisted={track.isUnlisted}
          isSaved={track.isSaved}
          isReposted={track.isReposted}
          isActive={track.isActive}
          isPlaying={track.isPlaying}
          isStreamGated={track.isStreamGated}
          hasStreamAccess={track.hasStreamAccess}
          streamConditions={track.streamConditions}
          permalink={track.permalink}
          trackTitle={track.trackTitle}
          coverArtSizes={track.coverArtSizes}
          uid={track.uid}
          isDeleted={track.isDeleted}
          isLocked={track.isLocked}
          onRemove={onRemove}
          togglePlay={togglePlay}
          trackItemAction={trackItemAction}
          isReorderable={isReorderable}
          isDragging={isDragging}
        />
      </div>
    )
    const key = track?.time
      ? `${track.trackId}:${track.time}`
      : track.trackId.toString()
    return isReorderable ? (
      <Draggable key={key} draggableId={key} index={idx}>
        {(provided: any, snapshot: any) => {
          const updatedStyles = provided.draggableProps.style.transform
            ? {
                transform: `translate3d(0, ${provided.draggableProps.style.transform.substring(
                  provided.draggableProps.style.transform.indexOf(',') + 1,
                  provided.draggableProps.style.transform.indexOf(')')
                )}, 0)`
              }
            : {}
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                ...provided.dragHandleProps.style,
                ...updatedStyles
              }}
            >
              {listItem(snapshot.isDragging)}
            </div>
          )
        }}
      </Draggable>
    ) : (
      listItem()
    )
  })

  return (
    <div
      className={cn(styles.trackListContainer, containerClassName, {
        [styles.border]: showBorder
      })}
    >
      {isReorderable ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId='track-list-droppable' type='TRACK'>
            {(provided: any) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {renderedTracks}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        renderedTracks
      )}
    </div>
  )
}

export default memo(TrackList)
