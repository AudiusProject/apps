import { Collection, Track } from '~/models'
import { EntityType } from '~/store'

import { Nullable } from './typeUtils'

/** Typeguard for determining if content is a Track but can return as a subset of the Track type */
export const isContentPartialTrack = <T extends Partial<Track>>(
  content?: Nullable<Partial<Track | Collection>>
): content is T => !!content && 'track_id' in content

/** Typeguard for determiniing if content is a Track */
export const isContentTrack = (
  content?: Nullable<Partial<Track | Collection>>
): content is Track => !!content && 'track_id' in content

/** Typeguard for determiniing if content is a Collection */
export const isContentCollection = (
  content?: Nullable<Partial<Track | Collection>>
): content is Collection => !!content && 'playlist_id' in content

/** Returns the title or playlist_name given a track, playlist, or album */
export const getEntityTitle = (entity: Nullable<EntityType>) => {
  if (!entity) return ''
  return 'title' in entity
    ? entity?.title
    : 'playlist_name' in entity
      ? entity?.playlist_name
      : ''
}
