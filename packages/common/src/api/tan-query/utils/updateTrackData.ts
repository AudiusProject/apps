import { QueryClient } from '@tanstack/react-query'
import { mergeWith } from 'lodash'
import { getContext } from 'typed-redux-saga'

import { ID, Track } from '~/models'
import { mergeCustomizer } from '~/store/cache/mergeCustomizer'

import { getTrackQueryKey } from '../tracks/useTrack'

import { primeTrackData } from './primeTrackData'

type PartialTrackUpdate = Partial<Track> & { track_id: ID }

export const updateTrackData = function* (partialTracks: PartialTrackUpdate[]) {
  const queryClient = yield* getContext<QueryClient>('queryClient')

  const tracksToUpdate = partialTracks.map((partialTrack) => {
    const { track_id } = partialTrack
    const existingTrack = queryClient.getQueryData(
      getTrackQueryKey(track_id)
    ) as Track | undefined

    if (existingTrack) {
      return mergeWith({}, existingTrack, partialTrack, mergeCustomizer)
    }
    return partialTrack as Track
  })

  primeTrackData({
    tracks: tracksToUpdate,
    queryClient,
    forceReplace: true
  })
}
