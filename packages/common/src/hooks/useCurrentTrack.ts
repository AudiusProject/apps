import { useSelector } from 'react-redux'

import { SelectableQueryOptions, useTrack } from '~/api'
import { TQTrack } from '~/api/tan-query/models'

import { playbackSelectors } from '../store/playback'

const { getTrackId } = playbackSelectors

export const useCurrentTrack = <TResult = TQTrack>(
  options?: SelectableQueryOptions<TQTrack, TResult>
) => {
  const trackId = useSelector(getTrackId)
  const { data: track } = useTrack(trackId, options)
  return track ?? null
}
