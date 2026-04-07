import { Collection, Status } from '@audius/common/models'
import { CollectionTrack } from '@audius/common/store'

export const computeCollectionMetadataProps = (
  metadata: Collection | null,
  tracks: {
    status: Status
    entries: CollectionTrack[]
  }
) => {
  const trackCount =
    metadata && metadata.playlist_contents
      ? metadata.playlist_contents.track_ids.length
      : 0
  const isEmpty =
    metadata &&
    (trackCount === 0 ||
      (tracks.status === Status.SUCCESS &&
        tracks.entries.length > 0 &&
        tracks.entries.every((t) => t.is_delete)))
  const lastModifiedDate = metadata ? metadata.updated_at || Date.now() : ''
  const releaseDate = metadata ? metadata.created_at || Date.now() : ''
  const playlistName = metadata ? metadata.playlist_name : ''
  const description =
    metadata && metadata.description ? metadata.description : ''
  const isPrivate = metadata ? metadata.is_private : false
  const isAlbum = metadata ? metadata.is_album : false
  const isPublishing = metadata ? metadata._is_publishing : false
  const playlistSaveCount = metadata ? metadata.save_count || 0 : 0
  const playlistRepostCount = metadata ? metadata.repost_count || 0 : 0
  const isReposted = metadata ? metadata.has_current_user_reposted : false

  return {
    trackCount,
    isEmpty,
    lastModifiedDate,
    playlistName,
    description,
    isPrivate,
    isAlbum,
    isPublishing,
    playlistSaveCount,
    playlistRepostCount,
    isReposted,
    releaseDate
  }
}
