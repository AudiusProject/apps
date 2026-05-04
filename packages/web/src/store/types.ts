import {
  averageColorReducer,
  remixesPageReducer as RemixesPageReducer,
  remoteConfigReducer as RemoteConfigReducer,
  stemsUploadReducer as StemsUploadReducer,
  CollectionsPageState,
  HistoryPageState,
  ReachabilityState,
  CommonState,
  FavoritesPageState,
  FollowersPageState,
  FollowingPageState,
  NotificationUsersPageState,
  RepostsPageState
} from '@audius/common/store'

import SignOnPageState from 'common/store/pages/signon/types'
import { EmbedModalState } from 'components/embed-modal/store/types'
import { FirstUploadModalState } from 'components/first-upload-modal/store/slice'
import { PasswordResetState } from 'components/password-reset/store/types'
import { UnfollowConfirmationModalState } from 'components/unfollow-confirmation-modal/store/types'
import VisualizerReducer from 'pages/visualizer/store/slice'
import AppCTAModalReducer from 'store/application/ui/app-cta-modal/slice'
import { ErrorState } from 'store/errors/reducers'

import { BackendState } from '../common/store/backend/types'

import { CookieBannerState } from './application/ui/cookieBanner/types'
import { ScrollLockState } from './application/ui/scrollLock/types'
import { UserListModalState } from './application/ui/userListModal/types'
import { DragnDropState } from './dragndrop/slice'
const averageColor = averageColorReducer

export type AppState = CommonState & {
  // These belong in CommonState but are here until we move them to the @audius/common package:
  backend: BackendState

  signOn: SignOnPageState

  // Config
  reachability: ReachabilityState
  // Account
  passwordReset: PasswordResetState

  // UI
  dragndrop: DragnDropState

  // Global
  application: {
    ui: {
      appCTAModal: ReturnType<typeof AppCTAModalReducer>
      averageColor: ReturnType<typeof averageColor>
      cookieBanner: CookieBannerState
      embedModal: EmbedModalState
      firstUploadModal: FirstUploadModalState
      scrollLock: ScrollLockState
      stemsUpload: ReturnType<typeof StemsUploadReducer>
      userListModal: UserListModalState
      visualizer: ReturnType<typeof VisualizerReducer>
    }
    pages: {
      reposts: RepostsPageState
      favorites: FavoritesPageState
      followers: FollowersPageState
      following: FollowingPageState
      notificationUsers: NotificationUsersPageState
      unfollowConfirmation: UnfollowConfirmationModalState
      remixes: ReturnType<typeof RemixesPageReducer>
    }
    account: {
      guestEmail: string | null
    }
  }

  // Pages
  history: HistoryPageState
  collection: CollectionsPageState

  // Remote Config + Flags
  remoteConfig: ReturnType<typeof RemoteConfigReducer>

  // Error Page
  error: ErrorState
}
