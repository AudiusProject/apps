import { ID, User } from '@audius/common/models'

import { ImageFieldValue } from 'pages/sign-up-page/components/ImageField'

export enum EditingStatus {
  EDITING = 'editing',
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

export interface EditableField<T = string> {
  value: T
  error: string
  status: EditingStatus
}

export default interface SignOnPageState {
  email: EditableField
  name: EditableField
  password: EditableField
  otp: EditableField
  handle: EditableField
  genres: string[]
  isGuest: boolean
  verified: boolean
  usingExternalWallet: boolean
  accountReady: boolean
  accountAlreadyExisted: boolean
  linkedSocialOnFirstPage: boolean
  profileImage: ImageFieldValue
  coverPhoto: ImageFieldValue
  suggestedFollowIds: ID[]
  suggestedFollowEntries: User[]
  followIds: ID[]
  status: EditingStatus
  hidePreviewHint: boolean
  selectedUserIds: ID[]
  isMobileSignOnVisible: boolean
  routeOnCompletion: string
  startedSignUpProcess: boolean
  finishedPhase1: boolean
  finishedSignUpProcess: boolean
  routeOnExit: string
  page: Pages
  referrer: ID
  welcomeModalShown: boolean
}

export type { SignOnPageState }

export type SignOnPageReducer = (
  state: SignOnPageState,
  action: unknown
) => SignOnPageState

export enum Pages {
  SIGNIN = 'SIGNIN',
  EMAIL = 'EMAIL',
  PASSWORD = 'PASSWORD',
  PROFILE = 'PROFILE',
  FOLLOW = 'FOLLOW',
  LOADING = 'LOADING',
  START = 'START',
  NOTIFICATION_SETTINGS = 'NOTIFICATION_SETTINGS',
  APP_CTA = 'APP_CTA'
}
