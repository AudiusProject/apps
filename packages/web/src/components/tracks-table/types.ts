import { UserTrack, UID } from '@audius/common/models'

import type { TableProps } from 'components/table/Table'

export type TracksTableColumn =
  | 'addedDate'
  | 'artistName'
  | 'date'
  | 'length'
  | 'listenDate'
  | 'overflowActions'
  | 'overflowMenu'
  | 'playButton'
  | 'plays'
  | 'releaseDate'
  | 'reposts'
  | 'saves'
  | 'savedDate'
  | 'spacer'
  | 'trackName'
  | 'comments'

export type TrackWithUID = UserTrack & {
  uid: UID
}

export type TracksTableProps = {
  disabledTrackEdit?: boolean
  isAlbumPage?: boolean
  shouldShowGatedType?: boolean
  onClickFavorite?: (track: TrackWithUID) => void
  onClickRemove?: (
    track: TrackWithUID,
    index: number,
    uid: string,
    timestamp: number
  ) => void
  onClickRepost?: (track: TrackWithUID) => void
  playing?: boolean
  removeText?: string
  userId?: number | null
  onReorder?: (source: number, destination: number) => void
  onSort?: (...props: any[]) => void
  columns?: TracksTableColumn[]
  showArtistInTrackNameColumn?: boolean
  onClickRow?: (track: TrackWithUID, index: number) => void
} & Omit<TableProps, 'onClickRow' | 'columns'>
