import { route } from '@audius/common/utils'

import {
  SET_ACCOUNT_READY,
  SET_FIELD,
  SET_VALUE_FIELD,
  SET_TWITTER_PROFILE,
  SET_INSTAGRAM_PROFILE,
  SET_TIKTOK_PROFILE,
  VALIDATE_EMAIL,
  VALIDATE_EMAIL_SUCCEEDED,
  VALIDATE_EMAIL_FAILED,
  VALIDATE_HANDLE,
  VALIDATE_HANDLE_SUCCEEDED,
  VALIDATE_HANDLE_FAILED,
  RESET_SIGN_ON,
  OPEN_SIGN_ON,
  NEXT_PAGE,
  PREVIOUS_PAGE,
  UNSET_SOCIAL_PROFILE,
  GO_TO_PAGE,
  SET_STATUS,
  SIGN_UP,
  START_SIGN_UP,
  FINISH_SIGN_UP,
  SIGN_UP_SUCCEEDED,
  SIGN_UP_FAILED,
  SIGN_IN,
  SIGN_IN_FAILED,
  SIGN_IN_SUCCEEDED,
  COMPLETE_FOLLOW_ARTISTS,
  USING_EXTERNAL_WALLET,
  UPDATE_ROUTE_ON_COMPLETION,
  UPDATE_ROUTE_ON_EXIT,
  ADD_FOLLOW_ARTISTS,
  REMOVE_FOLLOW_ARTISTS,
  SET_REFERRER,
  SET_LINKED_SOCIAL_ON_FIRST_PAGE,
  SET_FINISHED_PHASE_1,
  HIDE_PREVIEW_HINT,
  SET_WELCOME_MODAL_SHOWN
} from './actions'
import { Pages } from './types'

const { FEED_PAGE, TRENDING_PAGE } = route

const createTextField = () => ({
  value: '',
  error: '',
  status: 'editing' // 'editing', 'loading', 'success', 'failure', 'disabled'
})

const initialState = {
  routeOnCompletion: FEED_PAGE,
  routeOnExit: TRENDING_PAGE,
  isMobileSignOnVisible: false,
  email: createTextField(),
  name: createTextField(),
  password: createTextField(),
  otp: createTextField(),
  handle: createTextField(),
  isGuest: false,
  /** Whether the user linked their social media account on the first page (email page) of the sign up flow */
  linkedSocialOnFirstPage: false,
  accountAlreadyExisted: false,
  verified: false,
  usingExternalWallet: false,
  accountReady: false,
  twitterId: '',
  twitterScreenName: '',
  instagramId: '',
  instagramScreenName: '',
  tikTokId: '',
  tikTokScreenName: '',
  profileImage: null, // Object with file blob & url
  coverPhoto: null, // Object with file blob & url
  status: 'editing', // 'editing', 'loading', 'success', or 'failure'
  page: Pages.EMAIL,
  startedSignUpProcess: false,
  /** Whether or not the user has fully completed the sign up flow */
  finishedSignUpProcess: false,
  /** Whether user finished the main part of the flow (before 'Select Genres'), upon which their account gets created */
  finishedPhase1: false,
  hidePreviewHint: false,
  selectedUserIds: [],
  genres: [],
  referrer: null,
  welcomeModalShown: false
}

const actionsMap = {
  [SET_ACCOUNT_READY](state) {
    return {
      ...state,
      accountReady: true
    }
  },
  [RESET_SIGN_ON](state) {
    return {
      ...initialState,
      // Don't reset route on completion or on exit so completing the form
      // even if toggling b/w sign up and sign in redirects to the right place
      routeOnCompletion: state.routeOnCompletion,
      routeOnExit: state.routeOnExit,
      isMobileSignOnVisible: state.isMobileSignOnVisible,
      welcomeModalShown: false
    }
  },
  [OPEN_SIGN_ON](state, action) {
    return {
      ...state,
      ...action.fields,
      page: action.page || state.page,
      routeOnExit: action.routeOnExit || window.location.pathname
    }
  },
  [NEXT_PAGE](state, action) {
    let newPage
    switch (state.page) {
      case Pages.EMAIL:
        newPage = Pages.PASSWORD
        break
      case Pages.PASSWORD:
        newPage = Pages.PROFILE
        break
      case Pages.PROFILE:
        newPage = Pages.FOLLOW
        break
      case Pages.FOLLOW: {
        if (!action.isMobile) {
          newPage = Pages.APP_CTA
        } else {
          newPage = Pages.LOADING
        }
        break
      }
      case Pages.NOTIFICATION_SETTINGS:
        newPage = Pages.LOADING
        break
      case Pages.APP_CTA:
        newPage = Pages.LOADING
        break
      case Pages.LOADING:
        newPage = Pages.START
        break
      default:
        newPage = Pages.EMAIL
    }
    return {
      ...state,
      page: newPage
    }
  },
  [PREVIOUS_PAGE](state, action) {
    let newPage
    switch (state.page) {
      case Pages.PASSWORD:
        newPage = Pages.EMAIL
        break
      case Pages.PROFILE:
        newPage = Pages.PASSWORD
        break
      case Pages.FOLLOW:
        newPage = Pages.PROFILE
        break
      case Pages.LOADING:
        newPage = Pages.FOLLOW
        break
      case Pages.START:
        newPage = Pages.LOADING
        break
      default:
        newPage = Pages.EMAIL
    }
    return {
      ...state,
      page: newPage
    }
  },
  [GO_TO_PAGE](state, action) {
    return {
      ...state,
      page: action.page
    }
  },
  [SET_STATUS](state, action) {
    return initialState
  },
  [SET_FIELD](state, action) {
    return {
      ...state,
      [action.field]: action.value
    }
  },
  [SET_VALUE_FIELD](state, action) {
    return {
      ...state,
      [action.field]: {
        ...state[action.field],
        value: action.value,
        error: '',
        status: 'editing'
      }
    }
  },
  [SET_FINISHED_PHASE_1](state, action) {
    return {
      ...state,
      finishedPhase1: action.finishedPhase1
    }
  },
  [SET_LINKED_SOCIAL_ON_FIRST_PAGE](state, action) {
    return {
      ...state,
      linkedSocialOnFirstPage: action.linkedSocialOnFirstPage
    }
  },
  [SET_TWITTER_PROFILE](state, action) {
    return {
      ...state,
      twitterId: action.twitterId,
      name: {
        value: action.profile.name,
        status: 'editing',
        error: ''
      },
      handle: {
        ...state.handle,
        value: action.profile.screen_name
      },
      twitterScreenName: action.profile.screen_name,
      profileImage: action.profileImage,
      coverPhoto: action.coverPhoto,
      verified: action.profile.verified
    }
  },
  [SET_INSTAGRAM_PROFILE](state, action) {
    return {
      ...state,
      instagramId: action.instagramId,
      name: {
        value: action.profile.full_name || '',
        status: 'editing',
        error: ''
      },
      handle: {
        ...state.handle,
        value: action.profile.username
      },
      instagramScreenName: action.profile.username,
      profileImage: action.profileImage || null,
      verified: action.profile.is_verified
    }
  },
  [SET_TIKTOK_PROFILE](state, action) {
    return {
      ...state,
      tikTokId: action.tikTokId,
      tikTokProfile: action.tikTokProfile,
      name: {
        value: action.profile.display_name || '',
        status: 'editing',
        error: ''
      },
      handle: {
        ...state.handle,
        value: action.profile.username
      },
      tikTokScreenName: action.profile.display_name,
      profileImage: action.profileImage || null,
      verified: action.profile.is_verified
    }
  },
  [UNSET_SOCIAL_PROFILE](state) {
    return {
      ...state,
      tikTokId: initialState.tikTokId,
      tikTokProfile: initialState.tikTokProfile,
      tikTokScreenName: initialState.tikTokScreenName,
      instagramId: initialState.instagramId,
      instagramScreenName: initialState.instagramScreenName,
      twitterId: initialState.twitterId,
      coverPhoto: initialState.coverPhoto,
      twitterScreenName: initialState.twitterScreenName,
      name: initialState.name,
      handle: initialState.handle,
      profileImage: initialState.profileImage,
      verified: initialState.verified
    }
  },
  [VALIDATE_EMAIL](state, action) {
    return {
      ...state,
      email: {
        ...state.email,
        status: 'loading'
      }
    }
  },
  [USING_EXTERNAL_WALLET](state, action) {
    return {
      ...state,
      usingExternalWallet: true
    }
  },
  [VALIDATE_EMAIL_SUCCEEDED](state, action) {
    return {
      ...state,
      email: {
        ...state.email,
        status: action.available ? 'success' : 'failure',
        error: action.available ? '' : 'inUse'
      }
    }
  },
  [VALIDATE_EMAIL_FAILED](state, action) {
    return {
      ...state,
      email: {
        ...state.email,
        status: 'failure',
        error: action.error
      }
    }
  },
  [VALIDATE_HANDLE](state, action) {
    return {
      ...state,
      handle: {
        ...state.handle,
        status: 'loading'
      }
    }
  },
  [VALIDATE_HANDLE_SUCCEEDED](state, action) {
    return {
      ...state,
      handle: {
        ...state.handle,
        status: 'success',
        error: ''
      }
    }
  },
  [VALIDATE_HANDLE_FAILED](state, action) {
    return {
      ...state,
      handle: {
        ...state.handle,
        status: 'failure',
        error: action.error
      }
    }
  },
  [SIGN_UP](state, action) {
    return {
      ...state,
      status: 'loading'
    }
  },
  [START_SIGN_UP](state, action) {
    return {
      ...state,
      startedSignUpProcess: true
    }
  },
  [FINISH_SIGN_UP](state, action) {
    return {
      ...state,
      finishedSignUpProcess: true
    }
  },
  [SIGN_UP_SUCCEEDED](state, action) {
    return {
      ...state,
      status: 'success'
    }
  },
  [SIGN_UP_FAILED](state, action) {
    return {
      ...state,
      status: 'failure'
    }
  },
  [SIGN_IN](state, action) {
    return {
      ...state,
      status: 'loading'
    }
  },
  [SIGN_IN_SUCCEEDED](state, action) {
    return {
      ...state,
      status: 'success'
    }
  },
  [SIGN_IN_FAILED](state, action) {
    return {
      ...state,
      status: 'failure',
      password: {
        ...state.password,
        status: 'failure',
        error: action.error
      },
      otp: createTextField()
    }
  },
  [UPDATE_ROUTE_ON_COMPLETION](state, action) {
    return {
      ...state,
      routeOnCompletion: action.route
    }
  },
  [COMPLETE_FOLLOW_ARTISTS](state, action) {
    return {
      ...state,
      finishedSignUpProcess: true
    }
  },
  [ADD_FOLLOW_ARTISTS](state, action) {
    return {
      ...state,
      selectedUserIds: [
        ...new Set(state.selectedUserIds.concat(action.userIds))
      ]
    }
  },
  [REMOVE_FOLLOW_ARTISTS](state, action) {
    const removeUserIds = new Set(action.userIds)
    return {
      ...state,
      selectedUserIds: state.selectedUserIds.filter(
        (id) => !removeUserIds.has(id)
      )
    }
  },
  [UPDATE_ROUTE_ON_EXIT](state, action) {
    return {
      ...state,
      routeOnExit: action.route
    }
  },
  [SET_REFERRER](state, action) {
    return {
      ...state,
      referrer: action.userId
    }
  },
  [HIDE_PREVIEW_HINT](state) {
    return {
      ...state,
      hidePreviewHint: true
    }
  },
  [SET_WELCOME_MODAL_SHOWN](state, action) {
    return {
      ...state,
      welcomeModalShown: action.value
    }
  }
}

export default function signOnReducer(state = initialState, action) {
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action)
}
