import { LibraryCategoryType, LibraryPageTabs } from './types'

export const ADD_LOCAL_COLLECTION = 'LIBRARY/ADD_LOCAL_COLLECTION'
export const REMOVE_LOCAL_COLLECTION = 'LIBRARY/REMOVE_LOCAL_COLLECTION'

export const SET_SELECTED_CATEGORY = 'LIBRARY/SET_SELECTED_CATEGORY'

export const addLocalCollection = ({
  collectionId,
  isAlbum,
  category
}: {
  collectionId: number
  isAlbum: boolean
  category: LibraryCategoryType
}) => ({
  type: ADD_LOCAL_COLLECTION,
  collectionId,
  isAlbum,
  category
})

export const removeLocalCollection = ({
  collectionId,
  isAlbum,
  category
}: {
  collectionId: number
  isAlbum: boolean
  category: LibraryCategoryType
}) => ({
  type: REMOVE_LOCAL_COLLECTION,
  collectionId,
  isAlbum,
  category
})

export const setSelectedCategory = ({
  category,
  currentTab
}: {
  category: LibraryCategoryType
  currentTab: LibraryPageTabs
}) => ({
  type: SET_SELECTED_CATEGORY,
  category,
  currentTab
})
