import {
  TrackForEdit,
  TrackForUpload,
  isTrackForUpload
} from '@audius/common/store'
import { FieldArray, useField } from 'formik'
import { DragDropContext, Draggable, Droppable } from '@atlaskit/pragmatic-drag-and-drop-react-beautiful-dnd-migration'

import { CollectionTrackField } from './CollectionTrackField'
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
          onDragEnd={(result) => {
            if (!result.destination) {
              return
            }
            move(result.source.index, result.destination.index)
          }}
        >
          <Droppable droppableId='tracks'>
            {(provided) => (
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
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
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
