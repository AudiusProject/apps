import { TrackMetadata } from '~/models'

import { Genre } from './genres'
import { Maybe } from './typeUtils'

export const isLongFormContent = (
  track: Maybe<Pick<TrackMetadata, 'genre'> | null>
) => track?.genre === Genre.Podcasts || track?.genre === Genre.Audiobooks
