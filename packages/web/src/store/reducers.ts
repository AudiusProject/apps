import {
  queueReducer as queue,
  remoteConfigReducer as remoteConfig,
  reducers as clientStoreReducers
} from '@audius/common/store'
import localForage from 'localforage'
import { combineReducers } from 'redux'

import backend from 'common/store/backend/reducer'
import signOnReducer from 'common/store/pages/signon/reducer'
import searchAiBar from 'common/store/search-ai-bar/reducer'
import embedModal from 'components/embed-modal/store/reducers'
import firstUploadModal from 'components/first-upload-modal/store/slice'
import passwordReset from 'components/password-reset/store/reducer'
import unfollowConfirmation from 'components/unfollow-confirmation-modal/store/reducers'
import dashboard from 'pages/dashboard-page/store/slice'
import deleted from 'pages/deleted-page/store/slice'
import visualizer from 'pages/visualizer/store/slice'
import appCTAModal from 'store/application/ui/app-cta-modal/slice'
import cookieBanner from 'store/application/ui/cookieBanner/reducer'
import editFolderModal from 'store/application/ui/editFolderModal/slice'
import scrollLock from 'store/application/ui/scrollLock/reducer'
import userListModal from 'store/application/ui/userListModal/slice'
import dragndrop from 'store/dragndrop/slice'
import error from 'store/errors/reducers'

const createRootReducer = () => {
  const commonStoreReducers = clientStoreReducers(localForage)

  return combineReducers({
    // Common store
    ...commonStoreReducers,
    // These also belong in common store reducers but are here until we move them to the @audius/common package.
    backend,
    signOn: signOnReducer,
    searchAiBar,

    // (End common store)

    // Account
    passwordReset,

    // UI Functions
    dragndrop,

    // Pages
    dashboard,

    // Playback
    queue,

    // Error Page
    error,

    // Remote config/flags
    remoteConfig,
    application: combineReducers({
      ui: combineReducers({
        appCTAModal,
        cookieBanner,
        editFolderModal,
        embedModal,
        firstUploadModal,
        scrollLock,
        userListModal,
        visualizer
      }),
      pages: combineReducers({
        deleted,
        unfollowConfirmation
      })
    })
  })
}

export default createRootReducer
