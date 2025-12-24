import {
  useCollectionByPermalink,
  useCollectionTracks
} from '@audius/common/api'
import { Name, SquareSizes } from '@audius/common/models'
import { CollectionValues } from '@audius/common/schemas'
import {
  EditCollectionValues,
  cacheCollectionsActions
} from '@audius/common/store'
import { isEqual } from 'lodash'
import { useDispatch } from 'react-redux'
import { useParams, useMatch, useSearchParams } from 'react-router'

import { EditCollectionForm } from 'components/edit-collection/EditCollectionForm'
import { Header } from 'components/header/desktop/Header'
import LoadingSpinnerFullPage from 'components/loading-spinner-full-page/LoadingSpinnerFullPage'
import Page from 'components/page/Page'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { useIsUnauthorizedForHandleRedirect } from 'hooks/useManagedAccountNotAllowedRedirect'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { track } from 'services/analytics'
import { replace } from 'utils/navigation'

import { getEditablePlaylistContents, updatePlaylistContents } from '../utils'

const { editPlaylist } = cacheCollectionsActions

type EditCollectionPageParams = {
  handle: string
  slug: string
}

const messages = {
  title: (isAlbum: boolean) => `Edit Your ${isAlbum ? 'Album' : 'Playlist'}`
}

export const EditCollectionPage = () => {
  const { handle, slug } = useParams<EditCollectionPageParams>()
  const isAlbum = Boolean(useMatch('/:handle/album/:slug/edit'))
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus')
  const permalink = `/${handle ?? ''}/${isAlbum ? 'album' : 'playlist'}/${slug ?? ''}`
  const dispatch = useDispatch()
  useRequiresAccount()
  useIsUnauthorizedForHandleRedirect(handle ?? '')

  const { data: collection, isLoading: isCollectionLoading } =
    useCollectionByPermalink(permalink)

  const { playlist_id, description, playlist_contents } = collection ?? {}

  const { data: tracks, isLoading: isTracksLoading } =
    useCollectionTracks(playlist_id)

  const artworkUrl = useCollectionCoverArt({
    collectionId: playlist_id,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  const initialValues = {
    ...collection,
    description: description ?? undefined,
    artwork: { url: artworkUrl! },
    tracks:
      playlist_contents && tracks
        ? getEditablePlaylistContents({
            playlist_contents,
            tracks
          })
        : [],
    isUpload: false
  } as CollectionValues

  const handleSubmit = (values: CollectionValues) => {
    const { playlist_contents, tracks, ...restValues } = values

    track({
      eventName: Name.COLLECTION_EDIT,
      properties: {
        id: playlist_id
      }
    })

    // We want to pay special attention to access condition changes
    if (!isEqual(values.stream_conditions, initialValues.stream_conditions)) {
      track({
        eventName: Name.COLLECTION_EDIT_ACCESS_CHANGED,
        properties: {
          id: playlist_id,
          from: initialValues.stream_conditions,
          to: values.stream_conditions
        }
      })
    }

    const updatedPlaylistContents = updatePlaylistContents(
      tracks,
      playlist_contents
    )

    const collection = {
      playlist_contents: updatedPlaylistContents,
      ...restValues
    }

    dispatch(editPlaylist(playlist_id!, collection as EditCollectionValues))

    dispatch(replace(permalink))
  }

  return (
    <Page header={<Header primary={messages.title(isAlbum)} showBackButton />}>
      {isCollectionLoading || isTracksLoading || !artworkUrl ? (
        <LoadingSpinnerFullPage />
      ) : (
        <EditCollectionForm
          isAlbum={isAlbum}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isUpload={false}
          focus={focus}
        />
      )}
    </Page>
  )
}
