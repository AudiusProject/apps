import { Collection, Track } from '~/models'
import { EntityType } from '~/store'

import { Nullable } from './typeUtils'

export const isContentPartialTrack = <T extends Partial<Track>>(
  content?: Nullable<Partial<Track | Collection>>
): content is T => !!content && 'track_id' in content

export const isContentTrack = (
  content?: Nullable<Partial<Track | Collection>>
): content is Track => !!content && 'track_id' in content

export const isContentCollection = (
  content?: Nullable<Partial<Track | Collection>>
): content is Collection => !!content && 'playlist_id' in content

export const getEntityTitle = (entity: Nullable<EntityType>) => {
  if (!entity) return ''
  return 'title' in entity
    ? entity?.title
    : 'playlist_name' in entity
      ? entity?.playlist_name
      : ''
}
