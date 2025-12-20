import type { CSSProperties, HTMLAttributes, ReactElement } from 'react'

import {
  DragDropContext,
  Draggable,
  Droppable
} from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration'
import {
  TrackForEdit,
  TrackForUpload,
  isTrackForUpload
} from '@audius/common/store'
import { FieldArray, useField } from 'formik'

import { CollectionTrackField } from './CollectionTrackField'

// Types matching react-beautiful-dnd API
type DropResult = {
  draggableId: string
  type: string
  source: {
    droppableId: string
    index: number
  }
  destination: {
    droppableId: string
    index: number
  } | null
  reason: 'DROP' | 'CANCEL'
}

type DroppableProvided = {
  innerRef: (element: HTMLElement | null) => void
  droppableProps: {
    'data-rbd-droppable-id': string
    'data-rbd-droppable-context-id': string
  }
  placeholder: ReactElement | null
}

type DraggableProvided = {
  innerRef: (element: HTMLElement | null) => void
  draggableProps: HTMLAttributes<HTMLElement> & {
    'data-rbd-draggable-context-id'?: string
    'data-rbd-draggable-id'?: string
    style?: CSSProperties
  }
  dragHandleProps:
    | (HTMLAttributes<HTMLElement> & {
        'data-rbd-drag-handle-draggable-id'?: string
        'data-rbd-drag-handle-context-id'?: string
        'aria-describedby'?: string
      })
    | null
}

const messages = {
  trackList: 'Track List'
}

const makeTrackKey = (track: TrackForUpload | TrackForEdit, index: number) => {
  if (isTrackForUpload(track)) {
    return track.file.name ?? `${index}`
  }
  const suffix = 'metadata_time' in track ? `-${track.metadata_time}` : ''
  return `${track.metadata.track_id}${suffix}`
}

export const CollectionTrackFieldArray = () => {
  const [{ value: tracks }] =
    useField<(TrackForUpload | TrackForEdit)[]>('tracks')

  return (
    <FieldArray name='tracks'>
      {({ move, remove }) => (
        <DragDropContext
          onDragEnd={(result: DropResult) => {
            if (!result.destination) {
              return
            }
            move(result.source.index, result.destination.index)
          }}
        >
          <Droppable droppableId='tracks'>
            {(provided: DroppableProvided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                role='list'
                aria-label={messages.trackList}
              >
                {tracks.map((track, index) => {
                  const id = makeTrackKey(track, index)

                  return (
                    <Draggable key={id} draggableId={id} index={index}>
                      {(provided: DraggableProvided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...(provided.dragHandleProps ?? {})}
                          role='listitem'
                        >
                          <CollectionTrackField
                            index={index}
                            remove={remove}
                            disableDelete={tracks.length === 1}
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
      )}
    </FieldArray>
  )
}
