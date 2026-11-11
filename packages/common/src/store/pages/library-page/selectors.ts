import { uniq } from 'lodash'
import { createSelector } from 'reselect'

import { CommonState } from '~/store/commonStore'

import { ID } from '../../../models/Identifiers'

import { LibraryCategory, LibraryPageTabs } from './types'

export const getLibrary = (state: CommonState) => state.pages.libraryPage

export const getCollectionsCategory = (state: CommonState) => {
  return state.pages.libraryPage.collectionsCategory
}

export const getTracksCategory = (state: CommonState) => {
  return state.pages.libraryPage.tracksCategory
}

export const getCategory = (
  state: CommonState,
  props: { currentTab: LibraryPageTabs }
) => {
  if (props.currentTab === LibraryPageTabs.TRACKS) {
    return getTracksCategory(state)
  } else {
    return getCollectionsCategory(state)
  }
}

export const getLocalTrackFavorites = (state: CommonState) =>
  state.pages.libraryPage.local.track.favorites.added
export const getLocalTrackFavorite = (state: CommonState, props: { id: ID }) =>
  state.pages.libraryPage.local.track.favorites.added[props.id]
export const getLocalTrackReposts = (state: CommonState) =>
  state.pages.libraryPage.local.track.reposts.added
export const getLocalTrackRepost = (state: CommonState, props: { id: ID }) =>
  state.pages.libraryPage.local.track.reposts.added[props.id]
export const getLocalTrackPurchases = (state: CommonState) =>
  state.pages.libraryPage.local.track.purchased.added
export const getLocalTrackPurchase = (state: CommonState, props: { id: ID }) =>
  state.pages.libraryPage.local.track.purchased.added[props.id]

export const getLocalAlbumFavorites = (state: CommonState) =>
  state.pages.libraryPage.local.album.favorites.added
export const getLocalAlbumReposts = (state: CommonState) =>
  state.pages.libraryPage.local.album.reposts.added
export const getLocalAlbumPurchases = (state: CommonState) =>
  state.pages.libraryPage.local.album.purchased.added
export const getLocalRemovedAlbumFavorites = (state: CommonState) =>
  state.pages.libraryPage.local.album.favorites.removed
export const getLocalRemovedAlbumReposts = (state: CommonState) =>
  state.pages.libraryPage.local.album.reposts.removed

export const getLocalPlaylistFavorites = (state: CommonState) =>
  state.pages.libraryPage.local.playlist.favorites.added
export const getLocalPlaylistReposts = (state: CommonState) =>
  state.pages.libraryPage.local.playlist.reposts.added
export const getLocalRemovedPlaylistFavorites = (state: CommonState) =>
  state.pages.libraryPage.local.playlist.favorites.removed
export const getLocalRemovedPlaylistReposts = (state: CommonState) =>
  state.pages.libraryPage.local.playlist.favorites.removed

/** Get the tracks in currently selected category that have been added to the library in current session */
export const getSelectedCategoryLocalTrackAdds = createSelector(
  [
    getTracksCategory,
    getLocalTrackFavorites,
    getLocalTrackPurchases,
    getLocalTrackReposts
  ],
  (selectedCategory, localFavorites, localPurchases, localReposts) => {
    if (selectedCategory === LibraryCategory.Favorite) {
      return localFavorites
    } else if (selectedCategory === LibraryCategory.Purchase) {
      return localPurchases
    } else if (selectedCategory === LibraryCategory.Repost) {
      return localReposts
    }
    // Category = ALL
    return {
      ...localReposts,
      ...localFavorites,
      ...localPurchases
    }
  }
)

const EMPTY_IDS: ID[] = []
const getNone = () => EMPTY_IDS

const makeGetSelectedCategoryLocalCollectionUpdates = ({
  collectionType,
  updateType
}: {
  collectionType: 'album' | 'playlist'
  updateType: 'add' | 'remove'
}) => {
  const isAlbum = collectionType === 'album'
  let getFavorites: (state: CommonState) => ID[]
  let getPurchases: (state: CommonState) => ID[]
  let getReposts: (state: CommonState) => ID[]
  if (updateType === 'add') {
    getFavorites = isAlbum ? getLocalAlbumFavorites : getLocalPlaylistFavorites
    getPurchases = isAlbum ? getLocalAlbumPurchases : getNone // Can't buy playlists
    getReposts = isAlbum ? getLocalAlbumReposts : getLocalPlaylistReposts
  } else {
    getFavorites = isAlbum
      ? getLocalRemovedAlbumFavorites
      : getLocalRemovedPlaylistFavorites
    getPurchases = getNone // Can't remove purchases
    getReposts = isAlbum
      ? getLocalRemovedAlbumReposts
      : getLocalRemovedPlaylistReposts
  }

  return createSelector(
    [getCollectionsCategory, getFavorites, getPurchases, getReposts],
    (selectedCategory, localFavorites, localPurchases, localReposts) => {
      switch (selectedCategory) {
        case LibraryCategory.Favorite:
          return localFavorites
        case LibraryCategory.Purchase:
          return localPurchases
        case LibraryCategory.Repost:
          return localReposts
        default:
          // Category = ALL
          return uniq([...localReposts, ...localFavorites, ...localPurchases])
      }
    }
  )
}

export const getSelectedCategoryLocalAlbumAdds =
  makeGetSelectedCategoryLocalCollectionUpdates({
    collectionType: 'album',
    updateType: 'add'
  })
export const getSelectedCategoryLocalAlbumRemovals =
  makeGetSelectedCategoryLocalCollectionUpdates({
    collectionType: 'album',
    updateType: 'remove'
  })
export const getSelectedCategoryLocalPlaylistRemovals =
  makeGetSelectedCategoryLocalCollectionUpdates({
    collectionType: 'playlist',
    updateType: 'remove'
  })
export const getSelectedCategoryLocalPlaylistAdds =
  makeGetSelectedCategoryLocalCollectionUpdates({
    collectionType: 'playlist',
    updateType: 'add'
  })
