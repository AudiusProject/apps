import { Storage, persistReducer } from 'redux-persist'

import { ID } from '~/models/Identifiers'
import {
  ADD_LOCAL_COLLECTION,
  REMOVE_LOCAL_COLLECTION,
  SET_SELECTED_CATEGORY
} from '~/store/pages/library-page/actions'
import { signOut } from '~/store/sign-out/slice'
import { ActionsMap } from '~/utils/reducer'

import { LibraryCategory, LibraryPageState } from './types'
import { calculateNewLibraryCategories } from './utils'

const initialState = {
  tracksCategory: LibraryCategory.All,
  collectionsCategory: LibraryCategory.All,
  local: {
    track: {
      favorites: {
        added: {},
        removed: {}
      },
      reposts: {
        added: {},
        removed: {}
      },
      purchased: {
        added: {}
      }
    },
    album: {
      favorites: {
        added: [],
        removed: []
      },
      reposts: {
        added: [],
        removed: []
      },
      purchased: {
        added: []
      }
    },
    playlist: {
      favorites: {
        added: [],
        removed: []
      },
      reposts: {
        added: [],
        removed: []
      }
    }
  }
} as LibraryPageState

const actionsMap: ActionsMap<LibraryPageState> = {
  [ADD_LOCAL_COLLECTION](state, action) {
    const kindKey = action.isAlbum ? 'album' : 'playlist'
    const categoryKey =
      action.category === LibraryCategory.Repost
        ? 'reposts'
        : action.category === LibraryCategory.Purchase
          ? 'purchased'
          : 'favorites'
    const newState = { ...state }
    newState.local[kindKey][categoryKey].added = [
      action.collectionId,
      ...newState.local[kindKey][categoryKey].added
    ]
    newState.local[kindKey][categoryKey].removed = newState.local[kindKey][
      categoryKey
    ].removed.filter((id: ID) => id !== action.collectionId)

    return newState
  },
  [REMOVE_LOCAL_COLLECTION](state, action) {
    const kindKey = action.isAlbum ? 'album' : 'playlist'
    const categoryKey =
      action.category === LibraryCategory.Repost
        ? 'reposts'
        : action.category === LibraryCategory.Purchase
          ? 'purchased'
          : 'favorites'
    const newState = { ...state }
    newState.local[kindKey][categoryKey].removed = [
      action.collectionId,
      ...newState.local[kindKey][categoryKey].removed
    ]
    newState.local[kindKey][categoryKey].added = newState.local[kindKey][
      categoryKey
    ].added.filter((id: ID) => id !== action.collectionId)

    return newState
  },
  [SET_SELECTED_CATEGORY](state, action) {
    return {
      ...state,
      ...calculateNewLibraryCategories({
        currentTab: action.currentTab,
        chosenCategory: action.category,
        prevTracksCategory: state.tracksCategory
      })
    }
  },
  [signOut.type]() {
    return initialState
  }
}

export const libraryPageReducer = (state = initialState, action: any) => {
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}

export const libraryPagePersistConfig = (storage: Storage) => ({
  key: 'library-page',
  storage,
  whitelist: ['tracksCategory', 'collectionsCategory']
})

export const persistedLibraryPageReducer = (storage: Storage) => {
  return persistReducer(libraryPagePersistConfig(storage), libraryPageReducer)
}
