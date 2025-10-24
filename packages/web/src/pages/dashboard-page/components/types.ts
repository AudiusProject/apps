import { Collection, Track } from '@audius/common/models'

export type DataSourceTrack = Track & {
  key: string
  name: string
  date: string
  time?: number
  saves: number
  reposts: number
  plays: number
  comments: number
}

export enum TrackFilters {
  PUBLIC = 'Public',
  PREMIUM = 'Premium',
  SPECIAL_ACCESS = 'SpecialAccess',
  HIDDEN = 'Hidden'
}

export type DataSourceAlbum = Collection & {
  key: string
  name: string
  date: string
  saves: number
  reposts: number
}

export enum AlbumFilters {
  PUBLIC = 'Public',
  PREMIUM = 'Premium',
  HIDDEN = 'Hidden'
}
