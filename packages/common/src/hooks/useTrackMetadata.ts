import { Mood } from '@audius/sdk'
import { pick } from 'lodash'

import { useTrack } from '~/api'
import { ID } from '~/models'
import { parseMusicalKey } from '~/utils/musicalKeys'
import { searchPage } from '~/utils/route'

import { Genre, getCanonicalName } from '../utils/genres'
import { formatDate, formatSecondsAsText } from '../utils/timeUtil'

export enum TrackMetadataType {
  ALBUM = 'album',
  DURATION = 'duration',
  GENRE = 'genre',
  MOOD = 'mood',
  KEY = 'key',
  BPM = 'bpm',
  RELEASE_DATE = 'releaseDate',
  UPDATED_AT = 'updatedAt'
}

type TrackMetadataProps = {
  trackId: ID
}

export type TrackMetadataInfo = {
  id: TrackMetadataType
  label: string
  value: string
  url?: string
}

export const useTrackMetadata = ({
  trackId
}: TrackMetadataProps): TrackMetadataInfo[] => {
  const { data: trackMetadata } = useTrack(trackId, {
    select: (track) =>
      pick(track, [
        'duration',
        'genre',
        'release_date',
        'mood',
        'is_unlisted',
        'musical_key',
        'bpm',
        'is_custom_bpm',
        'album_backlink'
      ])
  })

  if (!trackMetadata) return []

  const {
    duration,
    genre,
    release_date: releaseDate,
    mood,
    is_unlisted: isUnlisted,
    musical_key,
    bpm,
    is_custom_bpm: isCustomBpm,
    album_backlink
  } = trackMetadata

  const parsedBpm = bpm
    ? parseFloat((bpm ?? 0).toFixed(isCustomBpm ? 2 : 0)).toString()
    : ''

  const parsedMusicalKey = musical_key
    ? (parseMusicalKey(musical_key) ?? '')
    : ''

  const labels = [
    {
      id: TrackMetadataType.ALBUM,
      label: 'Album',
      value: album_backlink?.playlist_name ?? '',
      url: album_backlink?.permalink
    },
    {
      id: TrackMetadataType.GENRE,
      label: 'Genre',
      value: getCanonicalName(genre),
      url: searchPage({ category: 'tracks', genre: genre as Genre })
    },
    {
      id: TrackMetadataType.MOOD,
      label: 'Mood',
      value: mood,
      url: searchPage({ category: 'tracks', mood: mood as Mood })
    },
    {
      id: TrackMetadataType.KEY,
      label: 'Key',
      value: parsedMusicalKey,
      url: searchPage({ category: 'tracks', key: parsedMusicalKey })
    },
    {
      id: TrackMetadataType.BPM,
      label: 'BPM',
      value: parsedBpm,
      url: searchPage({ category: 'tracks', bpm: parsedBpm })
    },
    {
      id: TrackMetadataType.RELEASE_DATE,
      value: formatDate(releaseDate ?? ''),
      label: 'Released',
      isHidden: isUnlisted
    },
    {
      id: TrackMetadataType.DURATION,
      label: 'Duration',
      value: formatSecondsAsText(duration)
    }
  ].filter(({ isHidden, value }) => !isHidden && !!value)

  return labels
}
