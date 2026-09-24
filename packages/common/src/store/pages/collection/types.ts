import { ID, UID, Status, LineupTrack } from '~/models'
import type { Dayjs } from '~/utils/dayjs'

export type CollectionTrack = LineupTrack & {
  dateAdded: Dayjs
  /** Raw playlist_contents time (unix seconds). 0 when it was never written. */
  timeAdded?: number
}

export type CollectionsPageState = {
  collectionPermalink: string
  collectionId: ID | null
  status: Status | null
  userUid: UID | null
}

export type CollectionsPageType = 'playlist' | 'album'

export type CollectionPageTrackRecord = CollectionTrack & {
  key: string
  name: string
  artist: string
  handle: string
  date: Dayjs
  time: number
  plays: number | undefined
}
