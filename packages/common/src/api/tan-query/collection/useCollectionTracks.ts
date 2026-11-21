import { UseQueryOptions } from '@tanstack/react-query'

import { useCollection, useTracks } from '~/api'
import { ID } from '~/models'

export const useCollectionTracks = (
  collectionId: ID | null | undefined,
  options?: UseQueryOptions
) => {
  const { data: trackIds } = useCollection(collectionId, {
    select: (collection) =>
      collection?.playlist_contents.track_ids.map(({ track }) => track)
  })

  return useTracks(trackIds, options)
}
