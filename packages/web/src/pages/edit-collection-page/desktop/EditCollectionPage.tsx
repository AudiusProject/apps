import {
  useGetCurrentUserId,
  useGetPlaylistByPermalink
} from '@audius/common/api'
import { Name, SquareSizes, Status } from '@audius/common/models'
import { CollectionValues } from '@audius/common/schemas'
import {
  EditPlaylistValues,
  cacheCollectionsActions
} from '@audius/common/store'
import { replace } from 'connected-react-router'
import { isEqual } from 'lodash'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router'
import { useRouteMatch } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom-v5-compat'

import { EditCollectionForm } from 'components/edit-collection/EditCollectionForm'
import Header from 'components/header/desktop/Header'
import LoadingSpinnerFullPage from 'components/loading-spinner-full-page/LoadingSpinnerFullPage'
import Page from 'components/page/Page'
import { useCollectionCoverArt2 } from 'hooks/useCollectionCoverArt'
import { track } from 'services/analytics'

import { updatePlaylistContents } from '../utils'

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
  const isAlbum = Boolean(useRouteMatch('/:handle/album/:slug/edit'))
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus')
  const permalink = `/${handle}/${isAlbum ? 'album' : 'playlist'}/${slug}`
  const dispatch = useDispatch()

  const { data: currentUserId } = useGetCurrentUserId({})
  const { data: collection, status } = useGetPlaylistByPermalink(
    {
      permalink,
      currentUserId
    },
    { disabled: !currentUserId, force: true }
  )

  const { playlist_id, tracks, description } = collection ?? {}

  const artworkUrl = useCollectionCoverArt2(
    playlist_id,
    SquareSizes.SIZE_1000_BY_1000
  )

  const initialValues = {
    ...collection,
    description: description ?? undefined,
    artwork: { url: artworkUrl! },
    tracks: tracks?.map((track) => ({ metadata: track })) ?? [],
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

    dispatch(editPlaylist(playlist_id, collection as EditPlaylistValues))

    dispatch(replace(permalink))
  }

  return (
    <Page header={<Header primary={messages.title(isAlbum)} showBackButton />}>
      {status !== Status.SUCCESS || !artworkUrl ? (
        <LoadingSpinnerFullPage />
      ) : (
        <EditCollectionForm
          isAlbum={isAlbum}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isUpload={false}
          autoFocus={focus}
        />
      )}
    </Page>
  )
}
