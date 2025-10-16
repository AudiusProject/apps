import { ID, UID, LineupState, Status, LineupTrack } from '~/models'
import type { Dayjs } from '~/utils/dayjs'

export type CollectionTrack = LineupTrack & { dateAdded: Dayjs }

export type CollectionsPageState = {
  collectionPermalink: string
  collectionId: ID | null
  status: Status | null
  tracks: LineupState<CollectionTrack>
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
