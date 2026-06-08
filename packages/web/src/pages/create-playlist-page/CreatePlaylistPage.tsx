import { useEffect, useRef, useState } from 'react'

import {
  primeCollectionData,
  useCurrentAccountUser,
  useQueryContext
} from '@audius/common/api'
import { CollectionMetadata } from '@audius/common/models'
import { newCollectionMetadata } from '@audius/common/schemas'
import { route } from '@audius/common/utils'
import { Flex, LoadingSpinner } from '@audius/harmony'
import { Id } from '@audius/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router'

import {
  addDraftCollection,
  isDraftCollection
} from 'components/collection/desktop/edit-mode/draftCollections'
import { useRequiresAccount } from 'hooks/useRequiresAccount'

const { collectionPage, PLAYLIST_ID_PAGE } = route

const messages = {
  defaultName: 'My Playlist'
}

/**
 * Entry point for the inline "create playlist" flow. Generates a playlist id,
 * primes an unsaved draft collection into the query cache (nothing is written
 * to the backend), registers it as a draft, then redirects to the standard
 * collection page which renders the draft in edit/create mode.
 */
export const CreatePlaylistPage = () => {
  useRequiresAccount()
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: accountUser } = useCurrentAccountUser()

  const [draftId, setDraftId] = useState<number | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current || !accountUser) return
    startedRef.current = true

    const createDraft = async () => {
      const sdk = await audiusSdk()
      const id = await sdk.playlists.generatePlaylistId()
      if (!id) return

      const { user_id, handle } = accountUser
      const permalink = collectionPage(
        handle,
        messages.defaultName,
        id,
        undefined,
        false
      )

      const draft = newCollectionMetadata({
        playlist_id: id,
        playlist_owner_id: user_id,
        playlist_name: messages.defaultName,
        description: '',
        is_private: true,
        is_album: false,
        playlist_contents: { track_ids: [] },
        track_count: 0,
        save_count: 0,
        repost_count: 0,
        has_current_user_saved: false,
        has_current_user_reposted: false,
        is_delete: false,
        permalink
      }) as CollectionMetadata

      // forceReplace writes the draft into the cache; entityCacheOptions
      // (staleTime/gcTime Infinity) keep it from being refetched/clobbered.
      primeCollectionData({
        collections: [draft],
        queryClient,
        forceReplace: true
      })

      addDraftCollection(id)
      setDraftId(id)
    }

    createDraft()
  }, [accountUser, audiusSdk, queryClient])

  if (draftId != null && isDraftCollection(draftId)) {
    return (
      <Navigate
        to={PLAYLIST_ID_PAGE.replace(':id', Id.parse(draftId))}
        replace
      />
    )
  }

  return (
    <Flex w='100%' justifyContent='center' alignItems='center' p='3xl'>
      <LoadingSpinner css={{ width: 48, height: 48 }} />
    </Flex>
  )
}

export default CreatePlaylistPage
