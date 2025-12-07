import {
  getAccountStatusQueryKey,
  getWalletAccountSaga,
  queryAccountUser,
  queryHasAccount,
  queryIsAccountComplete,
  queryUserByHandle,
  queryUsers
} from '@audius/common/api'
import { GUEST_EMAIL } from '@audius/common/hooks'
import {
  Name,
  FavoriteSource,
  ID,
  FollowSource,
  ErrorLevel,
  InstagramUser,
  TikTokUser,
  Feature,
  Status
} from '@audius/common/models'
import {
  IntKeys,
  FeatureFlags,
  MAX_HANDLE_LENGTH,
  getCityAndRegion,
  SignInResponse,
  IS_MOBILE_USER_KEY
} from '@audius/common/services'
import {
  accountActions,
  settingsPageActions,
  collectionsSocialActions,
  usersSocialActions as socialActions,
  toastActions,
  getContext,
  confirmerActions,
  getSDK,
  fetchAccountAsync,
  getOrCreateUSDCUserBank,
  changePasswordActions,
  confirmTransaction
} from '@audius/common/store'
import {
  parseHandleReservedStatusFromSocial,
  isValidEmailString,
  route,
  isResponseError,
  TEMPORARY_PASSWORD,
  waitForValue
} from '@audius/common/utils'
import {
  OptionalId,
  CreateUserRequest,
  Id,
  UpdateProfileRequest
} from '@audius/sdk'
import { isEmpty } from 'lodash'
import {
  all,
  call,
  delay,
  fork,
  put,
  race,
  select,
  take,
  takeEvery,
  takeLatest
} from 'typed-redux-saga'

import { identify, make } from 'common/store/analytics/actions'
import { sendRecoveryEmail } from 'common/store/recovery-email/sagas'
import { UiErrorCode } from 'store/errors/actions'
import { reportToSentry } from 'store/errors/reportToSentry'
import { setHasRequestedBrowserPermission } from 'utils/browserNotifications'
import { push as pushRoute } from 'utils/navigation'
import { restrictedHandles } from 'utils/restrictedHandles'
import { waitForRead, waitForWrite } from 'utils/sagaHelpers'

import * as signOnActions from './actions'
import { watchSignOnError } from './errorSagas'
import {
  getFollowIds,
  getIsGuest,
  getRouteOnCompletion,
  getSignOn
} from './selectors'
import { Pages } from './types'

const { FEED_PAGE, SIGN_IN_PAGE, SIGN_UP_PAGE, SIGN_UP_PASSWORD_PAGE } = route
const { requestPushNotificationPermissions } = settingsPageActions
const { saveCollection } = collectionsSocialActions
const { toast } = toastActions

const SIGN_UP_TIMEOUT_MILLIS = 20 /* min */ * 60 * 1000
const DEFAULT_HANDLE_VERIFICATION_TIMEOUT_MILLIS = 5_000

const messages = {
  incompleteAccount:
    'Oops, it looks like your account was never fully completed!',
  emailCheckFailed: 'Something has gone wrong, please try again later.',
  deactivatedAccount:
    'Your account has been deactivated. Please contact support.'
}

function* getDefautFollowUserIds() {
  const { ENVIRONMENT } = yield* getContext('env')
  // Users ID to filter out of the suggested artists to follow list and to follow by default

  let defaultFollowUserIds: Set<number> = new Set([])

  switch (ENVIRONMENT) {
    case 'production': {
      // user id 51: official audius account
      defaultFollowUserIds = new Set([51])
      break
    }
    case 'staging': {
      // user id 1964: stage testing account
      defaultFollowUserIds = new Set([1964])
      break
    }
  }

  return defaultFollowUserIds
}

// Fetches whatever artists we want to follow for all accounts by default - aka the Audius acct
function* fetchDefaultFollowArtists() {
  yield* call(waitForRead)
  try {
    const defaultFollowUserIds = yield* call(getDefautFollowUserIds)
    yield* call(queryUsers, Array.from(defaultFollowUserIds))
  } catch (e: any) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: e,
      name: 'Sign Up: Unable to fetch default follow artists (aka Audius acct)',
      feature: Feature.SignUp
    })
  }
}

function* fetchReferrer(
  action: ReturnType<typeof signOnActions.fetchReferrer>
) {
  yield* waitForRead()
  const { handle } = action
  if (handle) {
    try {
      const user = yield* call(queryUserByHandle, handle)
      if (!user) return
      yield* put(signOnActions.setReferrer(user.user_id))
    } catch (e: any) {
      const reportToSentry = yield* getContext('reportToSentry')
      reportToSentry({
        error: e,
        name: 'Sign Up: fetchReferrer failed',
        feature: Feature.SignUp
      })
    }
  }
}

const isRestrictedHandle = (handle: string) =>
  restrictedHandles.has(handle.toLowerCase())
const isHandleCharacterCompliant = (handle: string) =>
  /^[a-zA-Z0-9_.]*$/.test(handle)

function* validateHandle(
  action: ReturnType<typeof signOnActions.validateHandle>
) {
  const { handle, isOauthVerified, onValidate } = action
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const identityService = yield* getContext('identityService')
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  const { ENVIRONMENT } = yield* getContext('env')

  yield* call(waitForWrite)
  try {
    if (handle.length > MAX_HANDLE_LENGTH) {
      yield* put(signOnActions.validateHandleFailed('tooLong'))
      if (onValidate) onValidate(true)
      return
    } else if (!isHandleCharacterCompliant(handle)) {
      yield* put(signOnActions.validateHandleFailed('characters'))
      if (onValidate) onValidate(true)
      return
    } else if (isRestrictedHandle(handle)) {
      yield* put(signOnActions.validateHandleFailed('inUse'))
      if (onValidate) onValidate(true)
      return
    }
    yield* delay(1000) // Wait 1000ms to debounce user input

    // Call fetch user by handle and do not retry if the user is not created, it will
    // return 404
    const user = yield* call(queryUserByHandle, handle)
    const handleInUse = !isEmpty(user)
    const handleCheckTimeout =
      remoteConfigInstance.getRemoteVar(
        IntKeys.HANDLE_VERIFICATION_TIMEOUT_MILLIS
      ) ?? DEFAULT_HANDLE_VERIFICATION_TIMEOUT_MILLIS

    if (ENVIRONMENT === 'production') {
      const verifyTwitter = remoteConfigInstance.getFeatureEnabled(
        FeatureFlags.VERIFY_HANDLE_WITH_TWITTER
      )
      const verifyInstagram = remoteConfigInstance.getFeatureEnabled(
        FeatureFlags.VERIFY_HANDLE_WITH_INSTAGRAM
      )
      const verifyTikTok = remoteConfigInstance.getFeatureEnabled(
        FeatureFlags.VERIFY_HANDLE_WITH_TIKTOK
      )

      const [twitterResult, instagramResult, tiktokResult] = yield* all([
        race({
          data: verifyTwitter
            ? call(
                [identityService, identityService.lookupTwitterHandle],
                handle
              )
            : null,
          timeout: delay(handleCheckTimeout)
        }),
        race({
          data: verifyInstagram
            ? call(audiusBackendInstance.instagramHandle, handle)
            : null,
          timeout: delay(handleCheckTimeout)
        }),
        race({
          data: verifyTikTok
            ? call(audiusBackendInstance.tiktokHandle, handle)
            : null,
          timeout: delay(handleCheckTimeout)
        })
      ])

      const twitterUserQuery = twitterResult?.timeout
        ? null
        : twitterResult?.data
      const instagramUser = instagramResult?.timeout
        ? null
        : instagramResult?.data
      const tikTokUser = tiktokResult?.timeout ? null : tiktokResult?.data

      const handleCheckStatus = parseHandleReservedStatusFromSocial({
        isOauthVerified,
        // @ts-ignore
        lookedUpTwitterUser: twitterUserQuery?.profile?.[0] ?? null,
        lookedUpInstagramUser: (instagramUser as InstagramUser) || null,
        lookedUpTikTokUser: (tikTokUser as TikTokUser) || null
      })

      if (handleCheckStatus !== 'notReserved') {
        yield* put(signOnActions.validateHandleFailed(handleCheckStatus))
        if (onValidate) onValidate(true)
        return
      }
    }

    if (handleInUse) {
      yield* put(signOnActions.validateHandleFailed('inUse'))
      if (onValidate) onValidate(true)
    } else {
      yield* put(signOnActions.validateHandleSucceeded())
      if (onValidate) onValidate(false)
    }
  } catch (err: any) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: err,
      name: 'Sign Up: validateHandle failed',
      feature: Feature.SignUp
    })
    yield* put(signOnActions.validateHandleFailed(err.message))
    if (onValidate) onValidate(true)
  }
}

function* checkEmail(action: ReturnType<typeof signOnActions.checkEmail>) {
  const identityService = yield* getContext('identityService')
  if (!isValidEmailString(action.email)) {
    yield* put(signOnActions.validateEmailFailed('characters'))
    return
  }

  try {
    const inUse = yield* call(
      [identityService, identityService.checkIfEmailRegistered],
      action.email
    )
    if (inUse) {
      yield* put(signOnActions.goToPage(Pages.SIGNIN))
      // let mobile client know that email is in use
      yield* put(signOnActions.validateEmailSucceeded(false))
      if (action.onUnavailable) {
        yield* call(action.onUnavailable)
      }
    } else {
      const trackEvent = make(Name.CREATE_ACCOUNT_COMPLETE_EMAIL, {
        emailAddress: action.email
      })
      yield* put(trackEvent)
      yield* put(signOnActions.validateEmailSucceeded(true))
      yield* put(signOnActions.goToPage(Pages.PASSWORD))
      if (action.onAvailable) {
        yield* call(action.onAvailable)
      }
    }
  } catch (error) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: error as Error,
      level: ErrorLevel.Error,
      name: 'Sign Up: email check failed',
      feature: Feature.SignUp
    })
    yield* put(toast({ content: messages.emailCheckFailed }))
    if (action.onError) {
      yield* call(action.onError)
    }
  }
}

function* validateEmail(
  action: ReturnType<typeof signOnActions.validateEmail>
) {
  if (!isValidEmailString(action.email)) {
    yield* put(signOnActions.validateEmailFailed('characters'))
  } else {
    yield* put(signOnActions.validateEmailSucceeded(true))
  }
}

function* sendPostSignInRecoveryEmail({
  handle,
  email
}: {
  handle: string
  email: string
}) {
  try {
    yield* call(sendRecoveryEmail)
  } catch (err) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: err instanceof Error ? err : new Error(err as string),
      name: 'Sign Up: Failed to send recovery email',
      additionalInfo: { handle, email },
      feature: Feature.SignUp
    })
  }
}

function* createGuestAccount(
  action: ReturnType<typeof signOnActions.createGuestAccount>
) {
  const { guestEmail } = action
  const reportToSentry = yield* getContext('reportToSentry')
  const localStorage = yield* getContext('localStorage')
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const queryClient = yield* getContext('queryClient')

  const sdk = yield* getSDK()

  const authService = yield* getContext('authService')

  // get user & user bank
  yield* put(
    confirmerActions.requestConfirmation(
      guestEmail,
      function* () {
        // clear existing user state
        yield* call([localStorage, 'clearAudiusAccount'])
        yield* call([localStorage, 'clearAudiusAccountUser'])
        yield* call([authService, authService.signOut])
        yield put(accountActions.resetAccount())
        queryClient.setQueryData(getAccountStatusQueryKey(), Status.SUCCESS)
        yield put(accountActions.setGuestEmail({ guestEmail }))

        const currentUser = yield* call(queryAccountUser)

        if (currentUser) {
          throw new Error('User already exists')
        }
        yield* call(
          [authService.hedgehogInstance, authService.hedgehogInstance.signUp],
          {
            username: guestEmail,
            password: TEMPORARY_PASSWORD,
            isGuest: true
          }
        )

        if (!guestEmail) {
          throw new Error('No email set for guest account')
        }
        const { blockHash, blockNumber, metadata } = yield* call([
          sdk.users,
          sdk.users.createGuestAccount
        ])
        yield* call(confirmTransaction, blockHash, blockNumber)
        yield* call(fetchAccountAsync, { shouldMarkAccountAsLoading: true })

        const userBank = yield* call(getOrCreateUSDCUserBank)
        if (!userBank) {
          throw new Error('Failed to create user bank')
        }

        // associates user record with blockchain user ID and creates notification settings
        // necessary for sending purchase emails
        yield* call(audiusBackendInstance.updateUserLocationTimezone, { sdk })

        yield* put(
          make(Name.CREATE_ACCOUNT_COMPLETE_GUEST_CREATING, {
            userId: metadata.userId
          })
        )
      },
      () => {},
      function* ({ error: err }: { error: Error }) {
        reportToSentry({
          error: err as Error,
          level: ErrorLevel.Fatal,
          name: 'Sign Up: Failed to create guest account',
          feature: Feature.SignUp
        })
      }
    )
  )
}

function* signUp() {
  const reportToSentry = yield* getContext('reportToSentry')
  const localStorage = yield* getContext('localStorage')
  const queryClient = yield* getContext('queryClient')

  try {
    const signOn = yield* select(getSignOn)
    const email = signOn.email.value
    const password = signOn.password.value
    const { usingExternalWallet } = signOn

    const isGuest = yield* select(getIsGuest)

    yield* call(waitForWrite)
    const sdk = yield* getSDK()

    const location = yield* call(getCityAndRegion)
    const name = signOn.name.value.trim()

    const handle = signOn.handle.value
    const alreadyExisted = signOn.accountAlreadyExisted
    const referrer = signOn.referrer

    yield* put(
      confirmerActions.requestConfirmation(
        handle,
        function* () {
          const reportToSentry = yield* getContext('reportToSentry')
          const isNativeMobile = yield* getContext('isNativeMobile')

          const createUserMetadata = {
            name,
            handle,
            profilePicture: (signOn.profileImage?.file as File) || null,
            coverPhoto: (signOn.coverPhoto?.file as File) || null,
            isVerified: signOn.verified,
            location
          }

          let userId: ID
          try {
            if (isGuest) {
              yield* put(
                accountActions.setGuestEmail({
                  guestEmail: null
                })
              )
              yield* call([localStorage, localStorage.removeItem], GUEST_EMAIL)

              const [wallet] = yield* call([
                sdk.services.audiusWalletClient,
                sdk.services.audiusWalletClient.getAddresses
              ])
              const account = yield* call(
                getWalletAccountSaga,
                wallet,
                sdk,
                queryClient
              )
              if (!account) {
                throw new Error('Account user ID does not exist')
              }
              userId = account.user.user_id
              const completeProfileMetadataRequest: UpdateProfileRequest = {
                userId: Id.parse(userId),
                profilePictureFile: signOn.profileImage?.file as File,
                metadata: {
                  location: location ?? undefined,
                  name,
                  handle
                }
              }

              const { blockHash, blockNumber } = yield* call(
                [sdk.users, sdk.users.updateProfile],
                completeProfileMetadataRequest
              )

              yield* put(
                changePasswordActions.changePassword({
                  email,
                  password,
                  oldPassword: TEMPORARY_PASSWORD
                })
              )

              yield* fork(sendPostSignInRecoveryEmail, { handle, email })

              yield* call(confirmTransaction, blockHash, blockNumber)
              yield* put(
                make(Name.CREATE_ACCOUNT_COMPLETE_GUEST_PROFILE, {
                  handle,
                  isGuest: true
                })
              )

              return userId
            } else {
              const authService = yield* getContext('authService')
              const hedgehog = authService.hedgehogInstance
              if (!alreadyExisted) {
                if (!usingExternalWallet) {
                  // Sign up via Hedgehog
                  yield* call([hedgehog, hedgehog.signUp], {
                    username: email,
                    password
                  })
                  yield* fork(sendPostSignInRecoveryEmail, { handle, email })
                } else {
                  // Still save user data to Identity if using 3p wallet
                  // so that users can manage their notifications settings etc.
                  const [wallet] = yield* call([
                    sdk.services.audiusWalletClient,
                    sdk.services.audiusWalletClient.getAddresses
                  ])
                  yield* call([hedgehog, hedgehog.setUserFn], {
                    walletAddress: wallet,
                    username: email
                  })
                }
              }

              const [wallet] = yield* call([
                sdk.services.audiusWalletClient,
                sdk.services.audiusWalletClient.getAddresses
              ])

              const events: CreateUserRequest['metadata']['events'] = {}
              if (referrer) {
                events.referrer = OptionalId.parse(referrer)
              }
              if (isNativeMobile) {
                events.isMobileUser = true
              }

              const createUserMetadata: CreateUserRequest = {
                profilePictureFile: signOn.profileImage?.file as File,
                coverArtFile: signOn.coverPhoto?.file as File,
                metadata: {
                  location: location ?? undefined,
                  name,
                  events,
                  handle,
                  wallet
                }
              }

              const { metadata } = yield* call(
                [sdk.users, sdk.users.createUser],
                createUserMetadata
              )
              userId = metadata.userId
            }

            yield* put(
              identify({
                handle,
                name,
                email,
                userId
              })
            )

            yield* put(signOnActions.signUpSucceededWithId(userId))

            if (!isNativeMobile) {
              // Set the has request browser permission to true as the signon provider will open it
              setHasRequestedBrowserPermission()
            } else {
              yield* call(
                [localStorage, localStorage.setItem],
                IS_MOBILE_USER_KEY,
                'true'
              )
            }
            return handle
          } catch (err: unknown) {
            // We are including 0 status code here to indicate rate limit,
            // which appears to be happening for some devices.
            const rateLimited =
              isResponseError(err) && [0, 429].includes(err.response.status)
            const blocked = isResponseError(err) && err.response.status === 403
            const error = err instanceof Error ? err : new Error(err as string)
            const params: signOnActions.SignUpFailedParams = {
              error: error.message,
              // TODO: Remove phase, stop using error Sagas for signup
              // We are mostly handling reporting here already and we're
              // only using it for error redirects.
              phase: 'CREATE_USER',
              shouldReport: false, // We are reporting in this saga
              shouldToast: rateLimited
            }
            if (rateLimited) {
              params.message = 'Please try again later'
              yield* put(
                make(Name.CREATE_ACCOUNT_RATE_LIMIT, {
                  handle,
                  email,
                  location
                })
              )
              reportToSentry({
                error,
                level: ErrorLevel.Warning,
                name: 'Sign Up: User rate limited',
                additionalInfo: {
                  handle,
                  email,
                  location,
                  formFields: createUserMetadata,
                  hasWallet: alreadyExisted
                },
                feature: Feature.SignUp
              })
            } else if (blocked) {
              params.message = 'User was blocked'
              params.uiErrorCode = UiErrorCode.RELAY_BLOCKED
              yield* put(
                make(Name.CREATE_ACCOUNT_BLOCKED, {
                  handle,
                  email,
                  location
                })
              )
              reportToSentry({
                error,
                level: ErrorLevel.Warning,
                name: 'Sign Up: User was blocked',
                additionalInfo: {
                  handle,
                  email,
                  location,
                  formFields: createUserMetadata,
                  hasWallet: alreadyExisted
                },
                feature: Feature.SignUp
              })
            } else {
              reportToSentry({
                error,
                name: 'Sign Up: Other Error',
                additionalInfo: {
                  handle,
                  email,
                  location,
                  formFields: createUserMetadata,
                  hasWallet: alreadyExisted
                },
                feature: Feature.SignUp
              })
            }
            yield* put(signOnActions.signUpFailed(params))
          }
        },
        function* () {
          yield* put(signOnActions.sendWelcomeEmail(name))
          yield* call(fetchAccountAsync, { shouldMarkAccountAsLoading: true })
          // Check if user has selected artists to follow
          const selectedUserIds = yield* select(getFollowIds)
          if (selectedUserIds && selectedUserIds.length > 0) {
            // User has selected artists, wait for them and follow
            yield* call(
              waitForValue,
              getFollowIds,
              null,
              (value: ID[]) => value.length > 0
            )
            yield* put(signOnActions.followArtists())
          } else {
            // User skipped artist selection, just follow default artists
            yield* put(signOnActions.followArtists())
          }
          yield* put(make(Name.CREATE_ACCOUNT_COMPLETE_CREATING, { handle }))
          yield* put(signOnActions.signUpSucceeded())
        },
        function* ({ timeout, error, message }) {
          if (timeout) {
            console.debug('Timed out trying to register')
            yield* put(signOnActions.signUpTimeout())
          }
          if (error) {
            const reportToSentry = yield* getContext('reportToSentry')
            reportToSentry({
              error,
              name: 'Sign Up: Unknown error in signUp saga',
              additionalInfo: { message, timeout },
              feature: Feature.SignUp
            })
          }
          if (message) {
            console.debug(message)
          }
        },
        () => {},
        SIGN_UP_TIMEOUT_MILLIS
      )
    )
  } catch (error) {
    reportToSentry({
      error: error as Error,
      name: 'Sign Up: Unknown error in signUp saga',
      feature: Feature.SignUp
    })
  }
}

function* signIn(action: ReturnType<typeof signOnActions.signIn>) {
  const { email, password, visitorId, otp } = action
  yield* put(make(Name.SIGN_IN_START, {}))

  const fingerprintClient = yield* getContext('fingerprintClient')
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  const authService = yield* getContext('authService')
  const isNativeMobile = yield* getContext('isNativeMobile')
  const isElectron = yield* getContext('isElectron')
  const queryClient = yield* getContext('queryClient')
  const clientOrigin = isNativeMobile
    ? 'mobile'
    : isElectron
      ? 'desktop'
      : 'web'

  yield* call(waitForRead)
  try {
    const signOn = yield* select(getSignOn)
    const isGuest = select(getIsGuest)

    const fpResponse = isGuest
      ? undefined // guest account should not use fingerprint
      : yield* call(
          [fingerprintClient, fingerprintClient.identify],
          email ?? signOn.email.value,
          clientOrigin
        )

    let signInResponse: SignInResponse
    try {
      signInResponse = yield* call(
        authService.signIn,
        email ?? signOn.email.value,
        password ?? signOn.password.value,
        visitorId ?? fpResponse?.visitorId,
        otp ?? signOn.otp.value
      )
    } catch (err) {
      // Login failed entirely (no wallet returned)
      yield* put(signOnActions.signInFailed(String(err), 'FIND_WALLET', false))
      const trackEvent = make(Name.SIGN_IN_FINISH, {
        status: 'invalid credentials'
      })
      yield* put(trackEvent)
      return
    }

    const account = yield* call(
      getWalletAccountSaga,
      signInResponse.walletAddress,
      sdk,
      queryClient
    )

    // Login succeeded but we found no account for the user (incomplete signup)
    if (!account) {
      yield* put(
        signOnActions.openSignOn(false, Pages.PROFILE, {
          accountAlreadyExisted: true
        })
      )

      yield* put(make(Name.SIGN_IN_WITH_INCOMPLETE_ACCOUNT, { handle: '' }))
      yield* call(reportToSentry, {
        error: new Error('Failed to fetch account')
      })

      yield* put(toastActions.toast({ content: messages.incompleteAccount }))
      yield* put(
        make(Name.SIGN_IN_WITH_INCOMPLETE_ACCOUNT, {
          email
        })
      )
      return
    }

    const { user } = account

    // Handle deactivated account
    if (user.is_deactivated) {
      yield* put(
        make(Name.SIGN_IN_WITH_DEACTIVATED_ACCOUNT, { handle: user.handle })
      )
      yield* put(signOnActions.signInFailed('Account is deactivated'))
      yield* put(toastActions.toast({ content: messages.deactivatedAccount }))
      return
    }

    // Login succeeded and we found a user, but it's missing name, likely
    // due to incomplete signup

    if (!user.name) {
      if (isGuest) {
        yield* put(
          signOnActions.openSignOn(false, Pages.PASSWORD, {
            accountAlreadyExisted: true,
            handle: {
              value: user.handle,
              status: 'disabled'
            }
          })
        )
        if (!isNativeMobile) {
          yield* put(pushRoute(SIGN_UP_PASSWORD_PAGE))
        }
      } else {
        yield* put(
          signOnActions.openSignOn(false, Pages.PROFILE, {
            accountAlreadyExisted: true,
            handle: {
              value: user.handle,
              status: 'disabled'
            }
          })
        )

        yield* put(toastActions.toast({ content: messages.incompleteAccount }))
      }

      yield* put(
        make(Name.SIGN_IN_WITH_INCOMPLETE_ACCOUNT, {
          email,
          handle: user.handle
        })
      )
      return
    }

    // Now that we have verified the user is valid, run the account fetch flow,
    // which will pull cached account data from call above.
    yield* put(
      accountActions.fetchAccount({ shouldMarkAccountAsLoading: true })
    )
    yield* put(signOnActions.signInSucceeded())
    const route = yield* select(getRouteOnCompletion)

    // NOTE: Wait on the account success before recording the signin event so that the user account is
    // populated in the store
    const { failure } = yield* race({
      success: take(accountActions.fetchAccountSucceeded.type),
      failure: take(accountActions.fetchAccountFailed)
    })
    if (failure) {
      yield* put(
        signOnActions.signInFailed(
          `Couldn't get account: ${failure.payload.reason}`,
          'FIND_USER',
          failure.payload.reason === 'ACCOUNT_DEACTIVATED'
        )
      )
      const trackEvent = make(Name.SIGN_IN_FINISH, {
        status: 'fetch account failed'
      })
      yield* put(trackEvent)
      return
    }

    // Apply retroactive referral
    if (signOn.referrer) {
      yield* fork(audiusBackendInstance.updateCreator, {
        metadata: { ...user, events: { referrer: signOn.referrer } },
        sdk
      })
    }

    yield* put(pushRoute(route || FEED_PAGE))

    const trackEvent = make(Name.SIGN_IN_FINISH, { status: 'success' })

    yield* put(trackEvent)

    yield* put(signOnActions.resetSignOn())

    if (!isNativeMobile) {
      // Reset the sign on in the background after page load as to relieve the UI loading
      yield* delay(1000)
    }
    if (isNativeMobile) {
      yield* put(requestPushNotificationPermissions())
    } else {
      setHasRequestedBrowserPermission()
      yield* put(accountActions.showPushNotificationConfirmation())
      if (user.handle === 'fbtest') {
        yield put(pushRoute('/fb/share'))
      }
    }
  } catch (err: any) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: err,
      name: 'Sign In: unknown error',
      feature: Feature.SignIn
    })
    yield* put(signOnActions.signInFailed(err))
  }
}

function* followCollections(
  collectionIds: ID[],
  favoriteSource: FavoriteSource
) {
  yield* call(waitForWrite)
  try {
    for (const collectionId of collectionIds) {
      yield* put(saveCollection(collectionId, favoriteSource))
    }
  } catch (err) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: err as Error,
      name: 'Sign Up: Follow collections failed',
      additionalInfo: { collectionIds, favoriteSource },
      feature: Feature.SignUp
    })
  }
}

/* This saga makes sure that artists chosen in sign up get followed accordingly */
function* completeFollowArtists(
  _action: ReturnType<typeof signOnActions.completeFollowArtists>
) {
  const isAccountComplete = yield* call(queryIsAccountComplete)
  if (isAccountComplete) {
    // If account creation has finished we need to make sure followArtists gets called
    // Also we specifically request to not follow the defaults (Audius user, Hot & New Playlist) since that should have already occurred
    yield* put(signOnActions.followArtists(true))
  }
  // Otherwise, Account creation still in progress and followArtists will get called already, no need to call here
}

function* followArtists(
  action: ReturnType<typeof signOnActions.followArtists>
) {
  const { skipDefaultFollows } = action
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  yield* call(waitForWrite)
  const sdk = yield* getSDK()
  const { ENVIRONMENT } = yield* getContext('env')
  const defaultFollowUserIds = skipDefaultFollows
    ? new Set([])
    : yield* call(getDefautFollowUserIds)
  try {
    // Auto-follow Hot & New Playlist
    if (!skipDefaultFollows) {
      if (ENVIRONMENT === 'production') {
        yield* fork(followCollections, [4281], FavoriteSource.SIGN_UP)
      } else if (ENVIRONMENT === 'staging') {
        yield* fork(followCollections, [555], FavoriteSource.SIGN_UP)
      }
    }

    const signOn = yield* select(getSignOn)
    const referrer = signOn.referrer

    const { selectedUserIds } = signOn
    const userIdsToFollow = [
      ...new Set([
        ...defaultFollowUserIds,
        ...selectedUserIds,
        ...(referrer == null ? [] : [referrer])
      ])
    ]

    for (const userId of userIdsToFollow) {
      yield* put(
        socialActions.followUser(userId as number, FollowSource.SIGN_UP)
      )
    }
    const hasFollowConfirmed = userIdsToFollow.map(() => false)
    while (!hasFollowConfirmed.every(Boolean)) {
      const { success, failed } = yield* race({
        success: take<ReturnType<typeof socialActions.followUserSucceeded>>(
          socialActions.FOLLOW_USER_SUCCEEDED
        ),
        failed: take<ReturnType<typeof socialActions.followUserFailed>>(
          socialActions.FOLLOW_USER_FAILED
        )
      })
      const followAction = success || failed
      if (failed) {
        const reportToSentry = yield* getContext('reportToSentry')
        reportToSentry({
          error: new Error(failed.error),
          name: 'Sign Up: Artist follow failed during sign up',
          additionalInfo: {
            userId: failed.userId,
            userIdsToFollow,
            skipDefaultFollows
          },
          feature: Feature.SignUp
        })
      }
      const userIndex = userIdsToFollow.findIndex(
        (fId) => fId === followAction?.userId
      )
      if (userIndex > -1) hasFollowConfirmed[userIndex] = true
    }

    // Reload feed is in view
    yield* put(signOnActions.setAccountReady())
    // The update user location depends on the user being discoverable in discprov
    // So we wait until both the user is indexed and the follow user actions are finished
    yield* call(audiusBackendInstance.updateUserLocationTimezone, { sdk })
  } catch (err: any) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      error: err,
      name: 'Sign Up: Unkown error while following artists on sign up',
      feature: Feature.SignUp
    })
  }
}

function* watchCompleteFollowArtists() {
  yield* takeEvery(signOnActions.COMPLETE_FOLLOW_ARTISTS, completeFollowArtists)
}

function* watchFetchReferrer() {
  yield* takeLatest(signOnActions.FETCH_REFERRER, fetchReferrer)
}

function* watchCheckEmail() {
  yield* takeLatest(signOnActions.CHECK_EMAIL, checkEmail)
}

function* watchValidateEmail() {
  yield* takeLatest(signOnActions.VALIDATE_EMAIL, validateEmail)
}

function* watchValidateHandle() {
  yield* takeLatest(signOnActions.VALIDATE_HANDLE, validateHandle)
}

function* watchSignUp() {
  yield* takeLatest(
    signOnActions.SIGN_UP,
    function* (_action: ReturnType<typeof signOnActions.signUp>) {
      // Fetch the default follow artists in parallel so that we don't have to block on this later (thus adding perceived sign up time) in the follow artists step.
      yield* fork(fetchDefaultFollowArtists)
      yield* signUp()
    }
  )
}

function* watchCreateGuestAccount() {
  yield* takeLatest(signOnActions.CREATE_GUEST_ACCOUNT, createGuestAccount)
}

function* watchSignIn() {
  yield* takeLatest(signOnActions.SIGN_IN, signIn)
}

function* watchFollowArtists() {
  yield* takeLatest(signOnActions.FOLLOW_ARTISTS, followArtists)
}

function* watchOpenSignOn() {
  yield* takeLatest(
    signOnActions.OPEN_SIGN_ON,
    function* (action: ReturnType<typeof signOnActions.openSignOn>) {
      const route = action.signIn ? SIGN_IN_PAGE : SIGN_UP_PAGE
      yield* put(pushRoute(route))
    }
  )
}

function* watchSendWelcomeEmail() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  yield* takeLatest(
    signOnActions.SEND_WELCOME_EMAIL,
    function* (action: ReturnType<typeof signOnActions.sendWelcomeEmail>) {
      const hasAccount = yield* call(queryHasAccount)
      if (!hasAccount) return
      yield* call(audiusBackendInstance.sendWelcomeEmail, {
        sdk,
        name: action.name
      })
    }
  )
}

export default function sagas() {
  const sagas = [
    watchCompleteFollowArtists,
    watchFetchReferrer,
    watchCheckEmail,
    watchValidateEmail,
    watchValidateHandle,
    watchSignUp,
    watchSignIn,
    watchFollowArtists,
    watchOpenSignOn,
    watchSignOnError,
    watchSendWelcomeEmail,
    watchCreateGuestAccount
  ]
  return sagas
}
