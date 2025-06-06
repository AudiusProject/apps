import { Track, UID, User, Collection } from '../../../models'

export enum PlaylistOperations {
  ADD_TRACK = 'ADD_TRACK',
  REMOVE_TRACK = 'REMOVE_TRACK',
  REORDER = 'REORDER'
}

export type EnhancedCollectionTrack = Track & { user: User; uid: UID }

export type Image = {
  height?: number
  width?: number
  name?: string
  size?: number
  fileType?: string
  url: string
  file?: string | File | { uri: string; name: string; type: string }
}

export type EditCollectionValues = Collection & {
  entityType: 'playlist' | 'album'
  artwork: Image
  tracks?: { metadata: Track }[]
}
