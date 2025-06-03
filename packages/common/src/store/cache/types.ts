import { ID, UID } from '~/models/Identifiers'
import { Kind } from '~/models/Kind'

export type Entry<EntryT extends Metadata = Metadata> = {
  id: ID
  uid?: UID
  metadata: EntryT
  timestamp?: number
}

export type EntryMap<EntryT extends Metadata = Metadata> = {
  [id: string]: EntryT
}

export type EntriesByKind<EntryT extends Metadata = Metadata> = {
  [key in Exclude<Kind, Kind.TRACKS | Kind.COLLECTIONS>]?: EntryMap<EntryT>
}

export type Metadata = {
  blocknumber?: number
  local?: boolean
} & Record<string, any>

export type SubscriberInfo = {
  uid: UID
  id: string | number
}
