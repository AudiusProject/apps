import { useContext } from 'react'
import type React from 'react'

import { useCollection, useUser } from '@audius/common/api'
import {
  ShareSource,
  RepostSource,
  FavoriteSource
} from '@audius/common/models'
import type { ID } from '@audius/common/models'
import {
  collectionsSocialActions,
  deletePlaylistConfirmationModalUIActions,
  mobileOverflowMenuUISelectors,
  OverflowAction,
  usePublishConfirmationModal,
  cacheCollectionsActions
} from '@audius/common/store'
import type { OverflowActionCallbacks } from '@audius/common/store'
import { pick } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'

import { useNavigation } from 'app/hooks/useNavigation'
import { AppTabNavigationContext } from 'app/screens/app-screen'
import { setVisibility } from 'app/store/drawers/slice'
import { getIsCollectionMarkedForDownload } from 'app/store/offline-downloads/selectors'

const { getMobileOverflowModal } = mobileOverflowMenuUISelectors
const { requestOpen: openDeletePlaylist } =
  deletePlaylistConfirmationModalUIActions
const {
  repostCollection,
  undoRepostCollection,
  saveCollection,
  unsaveCollection,
  shareCollection
} = collectionsSocialActions
const { publishPlaylist } = cacheCollectionsActions

type Props = {
  render: (callbacks: OverflowActionCallbacks) => React.ReactElement
}

const CollectionOverflowMenuDrawer = ({ render }: Props) => {
  const dispatch = useDispatch()
  const { navigation: contextNavigation } = useContext(AppTabNavigationContext)
  const navigation = useNavigation({ customNavigation: contextNavigation })
  const { id: modalId } = useSelector(getMobileOverflowModal)
  const id = modalId as ID

  const { data: partialPlaylist } = useCollection(id, {
    select: (collection) =>
      pick(collection, 'playlist_name', 'is_album', 'playlist_owner_id')
  })
  const { playlist_name, is_album, playlist_owner_id } = partialPlaylist ?? {}
  const isCollectionMarkedForDownload = useSelector(
    getIsCollectionMarkedForDownload(id)
  )
  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()

  const { data: user } = useUser(playlist_owner_id)

  if (!partialPlaylist || !user) {
    return null
  }
  const { handle } = user

  if (!id || !handle || !playlist_name || is_album === undefined) {
    return null
  }

  const callbacks = {
    [OverflowAction.REPOST]: () =>
      dispatch(repostCollection(id, RepostSource.OVERFLOW)),
    [OverflowAction.UNREPOST]: () =>
      dispatch(undoRepostCollection(id, RepostSource.OVERFLOW)),
    [OverflowAction.FAVORITE]: () =>
      dispatch(saveCollection(id, FavoriteSource.OVERFLOW)),
    [OverflowAction.UNFAVORITE]: () => {
      if (isCollectionMarkedForDownload) {
        dispatch(
          setVisibility({
            drawer: 'UnfavoriteDownloadedCollection',
            visible: true,
            data: { collectionId: id }
          })
        )
      } else {
        dispatch(unsaveCollection(id, FavoriteSource.OVERFLOW))
      }
    },
    [OverflowAction.SHARE]: () =>
      dispatch(shareCollection(id, ShareSource.OVERFLOW)),
    [OverflowAction.VIEW_ALBUM_PAGE]: () => {
      navigation?.push('Collection', { id })
    },
    [OverflowAction.VIEW_PLAYLIST_PAGE]: () => {
      navigation?.push('Collection', { id })
    },
    [OverflowAction.VIEW_ARTIST_PAGE]: () => {
      navigation?.push('Profile', { handle })
    },
    [OverflowAction.EDIT_ALBUM]: () => {
      navigation?.push('EditCollection', { id })
    },
    [OverflowAction.EDIT_PLAYLIST]: () => {
      navigation?.push('EditCollection', { id })
    },
    [OverflowAction.DELETE_ALBUM]: () =>
      dispatch(openDeletePlaylist({ playlistId: id })),
    [OverflowAction.DELETE_PLAYLIST]: () =>
      dispatch(openDeletePlaylist({ playlistId: id })),
    [OverflowAction.PUBLISH_PLAYLIST]: () =>
      openPublishConfirmation({
        contentType: is_album ? 'album' : 'playlist',
        confirmCallback: () => dispatch(publishPlaylist(Number(id)))
      })
  }

  return render(callbacks)
}

export default CollectionOverflowMenuDrawer
