import { Collection, Track } from '@audius/common/models'
import { TrackForEdit, TrackForUpload } from '@audius/common/store'
import { Maybe } from '@audius/common/utils'
import { keyBy } from 'lodash'

import { removeNullable } from 'utils/typeUtils'

const playlistTrackLookupKey = (trackId: number, metadata_time?: number) =>
  `${trackId}-${metadata_time}`

export const updatePlaylistContents = (
  tracks: (TrackForEdit | TrackForUpload)[],
  playlist_contents: Maybe<Collection['playlist_contents']>
) => {
  if (!playlist_contents) return undefined

  const originalTracksMap = new Map(
    playlist_contents?.track_ids.map((item) => [
      playlistTrackLookupKey(item.track, item.metadata_time ?? item.time),
      item
    ])
  )

  const updatedPlaylistIds = tracks
    .map(
      (track) =>
        track.metadata.track_id &&
        originalTracksMap.get(
          playlistTrackLookupKey(
            track.metadata.track_id,
            'metadata_time' in track ? track.metadata_time : undefined
          )
        )
    )
    .filter(removeNullable)

  return { track_ids: updatedPlaylistIds }
}

export const getEditablePlaylistContents = ({
  playlist_contents,
  tracks
}: {
  playlist_contents: Collection['playlist_contents']
  tracks: Track[]
}): TrackForEdit[] => {
  const tracksById = keyBy(tracks, 'track_id')
  return playlist_contents.track_ids.map((playlistTrack) => ({
    metadata: tracksById[playlistTrack.track],
    metadata_time: playlistTrack.metadata_time ?? playlistTrack.time
  }))
}
