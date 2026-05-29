import {
  fileToSdk,
  playlistMetadataForCreateWithSDK,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import {
  getCollectionQueryKey,
  primeCollectionData,
  useCurrentAccountUser,
  useCurrentUserId,
  useQueryContext
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import { accountActions, EditCollectionValues } from '@audius/common/store'
import { Id, OptionalId } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

const { addAccountPlaylist } = accountActions

type CreateDraftPlaylistParams = {
  playlistId: ID
  metadata: EditCollectionValues
  trackIds: ID[]
}

/**
 * Persists a locally-drafted playlist (see the inline create flow) to the
 * backend in one shot: uploads artwork, writes metadata + ordered tracks, then
 * primes the confirmed playlist into the cache and adds it to the account.
 * Returns the confirmed collection so the caller can navigate to its permalink.
 */
export const useCreateDraftPlaylist = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: accountUser } = useCurrentAccountUser()

  return useMutation({
    mutationFn: async ({
      playlistId,
      metadata,
      trackIds
    }: CreateDraftPlaylistParams) => {
      const sdk = await audiusSdk()
      if (!currentUserId) throw new Error('Not logged in')

      const coverArtFile =
        metadata.artwork && 'file' in metadata.artwork
          ? (metadata.artwork.file as File)
          : undefined

      const now = Math.round(Date.now() / 1000) // seconds
      const sdkMetadata = playlistMetadataForCreateWithSDK(metadata as any)
      sdkMetadata.playlistId = Id.parse(playlistId)
      sdkMetadata.playlistContents = trackIds.map((trackId) => ({
        trackId: Id.parse(trackId),
        timestamp: now,
        metadataTimestamp: now
      }))

      await sdk.playlists.createPlaylist({
        userId: Id.parse(currentUserId),
        imageFile: coverArtFile
          ? fileToSdk(coverArtFile, 'cover_art')
          : undefined,
        metadata: sdkMetadata
      })

      const { data: playlist } = await sdk.playlists.getPlaylist({
        userId: OptionalId.parse(currentUserId),
        playlistId: Id.parse(playlistId)
      })

      const confirmed = playlist?.[0]
        ? userCollectionMetadataFromSDK(playlist[0])
        : null
      if (!confirmed) {
        throw new Error(`Could not load created playlist for id ${playlistId}`)
      }

      primeCollectionData({
        collections: [confirmed],
        queryClient,
        forceReplace: true
      })

      if (accountUser) {
        dispatch(
          addAccountPlaylist({
            id: confirmed.playlist_id,
            name: confirmed.playlist_name,
            is_album: false,
            user: { id: accountUser.user_id, handle: accountUser.handle },
            permalink: confirmed.permalink
          })
        )
      }

      return confirmed
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({
        queryKey: getCollectionQueryKey(playlistId)
      })
    }
  })
}
