import { ID, UID } from '~/models/Identifiers'
import { Kind } from '~/models/Kind'
import { Status } from '~/models/Status'
import { Nullable } from '~/utils/typeUtils'

export type Lineup<T, ExtraProps = {}> = {
  entries: T[]
  order: {
    [uid: string]: number
  }
  total: number
  deleted: number
  nullCount: number
  status: Status
  hasMore: boolean
  inView: boolean
  prefix: string
  page: number
  isMetadataLoading: boolean
} & ExtraProps

export type LineupEntry<T> = { uid: UID; kind: Kind; id: ID } & T

export type Order = Record<UID, number>

export type LineupState<T> = {
  entries: Array<LineupEntry<T>>
  order: Order
  total: number
  deleted: number
  nullCount: number
  status: Status
  hasMore: boolean
  inView: boolean
  prefix: string
  page: number
  isMetadataLoading: boolean
  dedupe?: boolean
  maxEntries: Nullable<number>
  entryIds?: Nullable<Set<UID>>
  payload?: unknown
  handle?: string
}
