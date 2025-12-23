import { useCallback } from 'react'

import { useCollection, useCurrentAccount } from '@audius/common/api'
import { FavoriteSource, ID } from '@audius/common/models'
import {
  collectionsSocialActions,
  playlistLibraryHelpers
} from '@audius/common/store'
import {
  IconHeart,
  IconButtonProps,
  IconButton,
  Tooltip
} from '@audius/harmony'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'

const { saveCollection, unsaveCollection } = collectionsSocialActions
const { findInPlaylistLibrary } = playlistLibraryHelpers

const messages = {
  favorite: 'Favorite',
  favorited: 'Favorited',
  unfavorite: 'Unfavorite'
}

type FavoriteButtonProps = Partial<IconButtonProps> & {
  collectionId?: ID
  isOwner?: boolean
}

export const FavoriteButton = (props: FavoriteButtonProps) => {
  const { collectionId, isOwner, color, ...other } = props

  const { data: userPlaylistLibrary } = useCurrentAccount({
    select: (account) => account?.playlistLibrary
  })

  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(collection, 'has_current_user_saved', 'playlist_name', 'save_count')
  })
  const {
    has_current_user_saved,
    playlist_name,
    save_count = 0
  } = partialCollection ?? {}

  const isInLibrary =
    !!playlist_name &&
    !!userPlaylistLibrary &&
    !!findInPlaylistLibrary(userPlaylistLibrary, playlist_name)

  const isSaved = has_current_user_saved || isInLibrary

  const dispatch = useDispatch()

  const handleFavorite = useCallback(() => {
    if (collectionId) {
      if (isSaved) {
        dispatch(unsaveCollection(collectionId, FavoriteSource.COLLECTION_PAGE))
      } else {
        dispatch(saveCollection(collectionId, FavoriteSource.COLLECTION_PAGE))
      }
    }
  }, [dispatch, isSaved, collectionId])

  return (
    <Tooltip
      disabled={isOwner || save_count === 0}
      text={isSaved ? messages.unfavorite : messages.favorite}
    >
      <IconButton
        color={color ?? (isSaved ? 'active' : 'subdued')}
        icon={IconHeart}
        size='2xl'
        onClick={handleFavorite}
        {...other}
        aria-label={isSaved ? messages.favorited : messages.favorite}
      />
    </Tooltip>
  )
}
