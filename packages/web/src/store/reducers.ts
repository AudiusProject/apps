import {
  remoteConfigReducer as remoteConfig,
  reducers as clientStoreReducers
} from '@audius/common/store'
import { combineReducers } from 'redux'

import backend from 'common/store/backend/reducer'
import signOnReducer from 'common/store/pages/signon/reducer'
import embedModal from 'components/embed-modal/store/reducers'
import firstUploadModal from 'components/first-upload-modal/store/slice'
import passwordReset from 'components/password-reset/store/reducer'
import unfollowConfirmation from 'components/unfollow-confirmation-modal/store/reducers'
import visualizer from 'pages/visualizer/store/slice'
import appCTAModal from 'store/application/ui/app-cta-modal/slice'
import cookieBanner from 'store/application/ui/cookieBanner/reducer'
import scrollLock from 'store/application/ui/scrollLock/reducer'
import userListModal from 'store/application/ui/userListModal/slice'
import dragndrop from 'store/dragndrop/slice'
import error from 'store/errors/reducers'
import { persistStorage } from 'store/persistStorage'

const createRootReducer = () => {
  const commonStoreReducers = clientStoreReducers(persistStorage)

  return combineReducers({
    ...commonStoreReducers,
    backend,
    signOn: signOnReducer,

    passwordReset,

    dragndrop,

    error,

    remoteConfig,
    application: combineReducers({
      ui: combineReducers({
        appCTAModal,
        cookieBanner,
        embedModal,
        firstUploadModal,
        scrollLock,
        userListModal,
        visualizer
      }),
      pages: combineReducers({
        unfollowConfirmation
      })
    })
  })
}

export default createRootReducer
