import { useCollection, useTrack, useUser } from '~/api'

import { ShareContent, ShareModalRequest } from '../store/ui/share-modal/types'

// Replaces the share-modal saga: derives populated ShareContent for the
// modal from a request payload (type + IDs). Each hook short-circuits when
// its ID is null, so we always call the same number of hooks.
export const useShareContent = (
  request: ShareModalRequest | null
): ShareContent | null => {
  const trackId =
    request?.type === 'track' || request?.type === 'contest'
      ? request.trackId
      : null
  const profileId = request?.type === 'profile' ? request.profileId : null
  const collectionId =
    request?.type === 'collection' ? request.collectionId : null

  const { data: track } = useTrack(trackId)
  const { data: profile } = useUser(profileId)
  const { data: collection } = useCollection(collectionId)

  const trackArtistId = track?.owner_id ?? null
  const collectionOwnerId = collection?.playlist_owner_id ?? null

  const { data: trackArtist } = useUser(trackArtistId)
  const { data: collectionOwner } = useUser(collectionOwnerId)

  if (!request) return null

  if (request.type === 'track' || request.type === 'contest') {
    if (!track || !trackArtist) return null
    return { type: request.type, track, artist: trackArtist }
  }

  if (request.type === 'profile') {
    if (!profile) return null
    return { type: 'profile', profile }
  }

  if (request.type === 'collection') {
    if (!collection || !collectionOwner) return null
    if (collection.is_album) {
      return { type: 'album', album: collection, artist: collectionOwner }
    }
    return { type: 'playlist', playlist: collection, creator: collectionOwner }
  }

  return null
}
