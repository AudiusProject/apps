import { useCallback } from 'react'

import { SquareSizes } from '@audius/common/models'
import type { EditPlaylistValues } from '@audius/common/store'
import {
  cacheCollectionsActions,
  cacheCollectionsSelectors
} from '@audius/common/store'
import { Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'

import { ModalScreen } from 'app/components/core'
import { useCollectionImage } from 'app/components/image/CollectionImage'
import { isImageUriSource } from 'app/hooks/useContentNodeImage'
import { useRoute } from 'app/hooks/useRoute'

import { EditPlaylistNavigator } from './EditPlaylistNavigator'

const { editPlaylist } = cacheCollectionsActions
const { getCollection } = cacheCollectionsSelectors

export const EditPlaylistModalScreen = () => {
  const { params } = useRoute<'EditPlaylist'>()
  const playlist = useSelector((state) =>
    getCollection(state, { id: params.id })
  )
  const dispatch = useDispatch()

  const trackImage = useCollectionImage({
    collection: playlist,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  const handleSubmit = useCallback(
    (values: EditPlaylistValues) => {
      if (playlist) {
        dispatch(editPlaylist(playlist.playlist_id, values))
      }
    },
    [dispatch, playlist]
  )

  if (!playlist) return null

  const { tracks: tracksIgnored, ...restPlaylist } = playlist

  const initialValues: EditPlaylistValues = {
    ...restPlaylist,
    artwork: {
      url:
        trackImage && isImageUriSource(trackImage.source)
          ? trackImage.source.uri ?? ''
          : ''
    }
  }

  return (
    <ModalScreen>
      <Formik
        initialValues={initialValues}
        initialStatus={{ imageLoading: false, imageGenerating: false }}
        onSubmit={handleSubmit}
      >
        {(formikProps) => (
          <EditPlaylistNavigator
            {...formikProps}
            playlistId={playlist.playlist_id}
          />
        )}
      </Formik>
    </ModalScreen>
  )
}
