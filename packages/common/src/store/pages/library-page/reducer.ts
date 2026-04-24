import { Storage, persistReducer } from 'redux-persist'

import { ID } from '~/models/Identifiers'
import {
  ADD_LOCAL_COLLECTION,
  ADD_LOCAL_TRACK,
  END_FETCHING,
  FETCH_MORE_SAVES,
  FETCH_MORE_SAVES_FAILED,
  FETCH_MORE_SAVES_SUCCEEDED,
  FETCH_SAVES,
  FETCH_SAVES_FAILED,
  FETCH_SAVES_REQUESTED,
  FETCH_SAVES_SUCCEEDED,
  REMOVE_LOCAL_COLLECTION,
  REMOVE_LOCAL_TRACK,
  SET_SELECTED_CATEGORY
} from '~/store/pages/library-page/actions'
import { signOut } from '~/store/sign-out/slice'
import { ActionsMap } from '~/utils/reducer'

import { LibraryCategory, LibraryCategoryType, LibraryPageState } from './types'
import { calculateNewLibraryCategories } from './utils'

const initialState = {
  trackSaves: [],
  initialFetch: false,
  hasReachedEnd: false,
  fetchingMore: false,
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

const getCategoryLocalStateKey = (
  category: Omit<LibraryCategoryType, 'all'>
) => {
  switch (category) {
    case LibraryCategory.Favorite:
      return 'favorites'
    case LibraryCategory.Purchase:
      return 'purchased'
    case LibraryCategory.Repost:
      return 'reposts'
    default:
      return 'favorites'
  }
}

const actionsMap: ActionsMap<LibraryPageState> = {
  [FETCH_SAVES](state) {
    return {
      ...state
    }
  },
  [FETCH_SAVES_REQUESTED](state) {
    return {
      ...state,
      initialFetch: true,
      hasReachedEnd: false
    }
  },
  [FETCH_SAVES_SUCCEEDED](state, action) {
    return {
      ...state,
      trackSaves: action.saves,
      initialFetch: false
    }
  },
  [FETCH_MORE_SAVES](state) {
    return {
      ...state,
      fetchingMore: true
    }
  },
  [FETCH_SAVES_FAILED](state) {
    return {
      ...state,
      fetchingMore: false,
      trackSaves: []
    }
  },
  [FETCH_MORE_SAVES_SUCCEEDED](state, action) {
    const savesCopy = state.trackSaves.slice()
    savesCopy.splice(action.offset, action.saves.length, ...action.saves)

    return {
      ...state,
      fetchingMore: false,
      trackSaves: savesCopy
    }
  },
  [FETCH_MORE_SAVES_FAILED](state) {
    return { ...state }
  },
  [END_FETCHING](state, action) {
    const savesCopy = state.trackSaves.slice(0, action.endIndex)
    return {
      ...state,
      trackSaves: savesCopy,
      hasReachedEnd: true
    }
  },
  [ADD_LOCAL_TRACK](state, action) {
    const categoryKey = getCategoryLocalStateKey(action.category)
    const newState = { ...state }
    newState.local.track[categoryKey].added = {
      ...newState.local.track[categoryKey].added,
      [action.trackId]: action.uid
    }
    return newState
  },
  [REMOVE_LOCAL_TRACK](state, action) {
    const categoryKey = getCategoryLocalStateKey(action.category)
    const newState = { ...state }
    delete newState.local.track[categoryKey].added[action.trackId]

    newState.trackSaves = newState.trackSaves.filter(
      ({ save_item_id: id }) => id !== action.trackId
    )
    return newState
  },
  [ADD_LOCAL_COLLECTION](state, action) {
    const kindKey = action.isAlbum ? 'album' : 'playlist'
    const categoryKey = getCategoryLocalStateKey(action.category)
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
    const categoryKey = getCategoryLocalStateKey(action.category)
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
