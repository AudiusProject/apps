import {
  undisbursedUserChallengeFromSDK,
  userChallengeFromSDK
} from '@audius/common/adapters'
import { QUERY_KEYS, queryCurrentUserId } from '@audius/common/api'
import {
  UserChallenge,
  ChallengeRewardID,
  SpecifierWithAmount,
  Name,
  Feature,
  ChallengeName
} from '@audius/common/models'
import {
  IntKeys,
  StringKeys,
  Env,
  RemoteConfigInstance
} from '@audius/common/services'
import {
  accountActions,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  HCaptchaStatus,
  ClaimStatus,
  modalsActions,
  getContext,
  musicConfettiActions,
  CommonStoreContext,
  getSDK
} from '@audius/common/store'
import {
  isResponseError,
  route,
  waitForValue,
  isPlayCountChallenge
} from '@audius/common/utils'
import {
  Id,
  AudiusSdk,
  ChallengeId,
  Errors,
  RewardManagerError
} from '@audius/sdk'
import {
  call,
  fork,
  put,
  race,
  select,
  take,
  takeEvery,
  takeLatest,
  delay,
  all
} from 'typed-redux-saga'

import { reportToSentry } from 'store/errors/reportToSentry'
import { waitForRead } from 'utils/sagaHelpers'
import {
  foregroundPollingDaemon,
  visibilityPollingDaemon
} from 'utils/sagaPollingDaemons'

const { AUDIO_PAGE } = route
const { show: showMusicConfetti } = musicConfettiActions
const { setVisibility } = modalsActions
const {
  getClaimStatus,
  getClaimToRetry,
  getUserChallenge,
  getUserChallengesOverrides,
  getUserChallengeSpecifierMap
} = audioRewardsPageSelectors
const {
  resetAndCancelClaimReward,
  claimChallengeReward,
  claimAllChallengeRewards,
  claimChallengeRewardFailed,
  claimChallengeRewardSucceeded,
  claimAllChallengeRewardsSucceeded,
  fetchUserChallenges,
  fetchUserChallengesFailed,
  fetchUserChallengesSucceeded,
  setHCaptchaStatus,
  setUserChallengesDisbursed,
  updateHCaptchaScore,
  showRewardClaimedToast,
  setUserChallengeCurrentStepCount,
  resetUserChallengeCurrentStepCount,
  updateOptimisticListenStreak,
  updateOptimisticPlayCount,
  setUndisbursedChallenges
} = audioRewardsPageActions
const fetchAccountSucceeded = accountActions.fetchAccountSucceeded

const CHALLENGE_REWARDS_MODAL_NAME = 'ChallengeRewards'

function getOracleConfig(remoteConfigInstance: RemoteConfigInstance, env: Env) {
  const { ENVIRONMENT, ORACLE_ETH_ADDRESSES, AAO_ENDPOINT } = env
  let oracleEthAddress = remoteConfigInstance.getRemoteVar(
    StringKeys.ORACLE_ETH_ADDRESS
  )
  let AAOEndpoint = remoteConfigInstance.getRemoteVar(
    StringKeys.ORACLE_ENDPOINT
  )
  if (ENVIRONMENT === 'development') {
    const oracleEthAddresses = (ORACLE_ETH_ADDRESSES || '').split(',')
    if (oracleEthAddresses.length > 0) {
      oracleEthAddress = oracleEthAddresses[0]
    }
    if (AAO_ENDPOINT) {
      AAOEndpoint = AAO_ENDPOINT
    }
  }

  return { oracleEthAddress, AAOEndpoint }
}

function* retryClaimChallengeReward({
  errorResolved,
  retryOnFailure
}: {
  errorResolved: boolean
  retryOnFailure: boolean
}) {
  const claimStatus = yield* select(getClaimStatus)
  const claim = yield* select(getClaimToRetry)
  if (!claim) return
  if (claimStatus === ClaimStatus.WAITING_FOR_RETRY) {
    // Restore the challenge rewards modal if necessary
    yield* put(
      setVisibility({ modal: CHALLENGE_REWARDS_MODAL_NAME, visible: true })
    )
    if (errorResolved) {
      yield* put(claimChallengeReward({ claim, retryOnFailure }))
    } else {
      yield* put(claimChallengeRewardFailed())
    }
  }
}

const getClaimingConfig = (
  remoteConfigInstance: RemoteConfigInstance,
  env: Env
) => {
  const { ENVIRONMENT } = env
  let quorumSize
  if (ENVIRONMENT === 'development') {
    quorumSize = 2
  } else {
    quorumSize = remoteConfigInstance.getRemoteVar(
      IntKeys.ATTESTATION_QUORUM_SIZE
    )
  }
  const maxClaimRetries = remoteConfigInstance.getRemoteVar(
    IntKeys.MAX_CLAIM_RETRIES
  )
  const rewardsAttestationEndpoints = remoteConfigInstance.getRemoteVar(
    StringKeys.REWARDS_ATTESTATION_ENDPOINTS
  )
  const parallelization = remoteConfigInstance.getRemoteVar(
    IntKeys.CLIENT_ATTESTATION_PARALLELIZATION
  )
  const completionPollTimeout =
    remoteConfigInstance.getRemoteVar(
      IntKeys.CHALLENGE_CLAIM_COMPLETION_POLL_TIMEOUT_MS
    ) ?? undefined
  const completionPollFrequency =
    remoteConfigInstance.getRemoteVar(
      IntKeys.CHALLENGE_CLAIM_COMPLETION_POLL_FREQUENCY_MS
    ) ?? undefined
  const { oracleEthAddress, AAOEndpoint } = getOracleConfig(
    remoteConfigInstance,
    env
  )

  return {
    quorumSize,
    maxClaimRetries,
    oracleEthAddress,
    AAOEndpoint,
    rewardsAttestationEndpoints,
    parallelization,
    completionPollFrequency,
    completionPollTimeout
  }
}

function* waitForOptimisticChallengeToComplete({
  challengeId,
  completionPollFrequency,
  completionPollTimeout
}: {
  challengeId: ChallengeRewardID
  completionPollFrequency?: number
  completionPollTimeout?: number
}) {
  const challenge = yield* select(getUserChallenge, {
    challengeId
  })
  if (challenge.challenge_type !== 'aggregate' && !challenge.is_complete) {
    console.info('Waiting for challenge completion...')
    const raceResult: { isComplete?: UserChallenge } = yield* race({
      isComplete: call(
        waitForValue,
        getUserChallenge,
        { challengeId },
        (challenge: UserChallenge) => challenge.is_complete
      ),
      poll: call(pollUserChallenges, completionPollFrequency ?? 1000),
      timeout: delay(completionPollTimeout ?? 10000)
    })
    if (!raceResult.isComplete) {
      console.warn(
        'Challenge still not marked as completed on DN. Attempting attestations anyway, but may fail...'
      )
    }
  }
}

type ErrorResult = SpecifierWithAmount & {
  error: unknown
}

async function claimRewardsForChallenge({
  sdk,
  userId,
  challengeId,
  specifiers,
  track,
  make
}: {
  sdk: AudiusSdk
  userId: string
  challengeId: ChallengeId
  specifiers: SpecifierWithAmount[]
  track: CommonStoreContext['analytics']['track']
  make: CommonStoreContext['analytics']['make']
}): Promise<(SpecifierWithAmount | ErrorResult)[]> {
  return await Promise.all(
    specifiers.map(async (specifierWithAmount) =>
      track(
        make({
          eventName: Name.REWARDS_CLAIM_REQUEST,
          challengeId,
          specifier: specifierWithAmount.specifier,
          amount: specifierWithAmount.amount
        })
      )
        .then(() =>
          sdk.rewards.claimRewards({
            claimRewardsRequest: {
              challengeId,
              specifier: specifierWithAmount.specifier,
              userId
            }
          })
        )
        .then((res) => {
          if (res?.data?.[0]?.error) {
            throw new Error(res.data[0].error)
          }
          track(
            make({
              eventName: Name.REWARDS_CLAIM_SUCCESS,
              challengeId,
              specifier: specifierWithAmount.specifier,
              amount: specifierWithAmount.amount
            })
          )
          return res
        })
        .then(() => {
          return specifierWithAmount
        })
        // Handle the individual specifier failures here to let the other
        // ones continue to claim and not reject the all() call.
        .catch(async (error: unknown) => {
          if (error instanceof Errors.AntiAbuseOracleAttestationError) {
            await track(
              make({
                eventName: Name.REWARDS_CLAIM_BLOCKED,
                challengeId,
                specifier: specifierWithAmount.specifier,
                amount: specifierWithAmount.amount,
                code: error.code as number
              })
            )
          } else if (isResponseError(error)) {
            // Error handling - tracking removed
          } else if (error instanceof RewardManagerError) {
            // Error handling - tracking removed
          } else {
            // Error handling - tracking removed
          }
          return {
            ...specifierWithAmount,
            error
          }
        })
    )
  )
}

function* claimSingleChallengeRewardAsync(
  action: ReturnType<typeof claimChallengeReward>
) {
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  const env = yield* getContext('env')
  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)
  const { track, make } = yield* getContext('analytics')

  const { claim } = action.payload
  const { specifiers, challengeId } = claim

  const { completionPollFrequency, completionPollTimeout } = getClaimingConfig(
    remoteConfigInstance,
    env
  )

  yield* call(waitForOptimisticChallengeToComplete, {
    challengeId,
    completionPollFrequency,
    completionPollTimeout
  })

  const userId = yield* call(queryCurrentUserId)
  if (!userId) {
    throw new Error('Failed to get current userId')
  }

  const results = yield* call(claimRewardsForChallenge, {
    sdk,
    userId: Id.parse(userId),
    challengeId: challengeId as ChallengeId,
    specifiers,
    track,
    make
  })
  const claimed = results.filter((r) => !('error' in r))

  const queryClient = yield* getContext('queryClient')
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.audioBalance]
  })
  yield* put(setUserChallengesDisbursed({ challengeId, specifiers: claimed }))

  const errors = results.filter((r): r is ErrorResult => 'error' in r)
  let aaoError: Errors.AntiAbuseOracleAttestationError | undefined
  if (errors.length > 0) {
    // Log and report errors for each specifier that failed to claim
    for (const res of errors) {
      const error =
        res.error instanceof Error ? res.error : new Error(String(res.error))
      console.error(
        `Failed to claim challenge: ${challengeId} specifier: ${res.specifier} for amount: ${res.amount} with error:`,
        error
      )
      if (res.error instanceof Errors.AntiAbuseOracleAttestationError) {
        aaoError = res.error
      } else {
        yield* call(reportToSentry, {
          error,
          name: 'ClaimRewards',
          additionalInfo: {
            challengeId,
            specifier: res.specifier,
            amount: res.amount
          },
          feature: Feature.Rewards
        })
      }
    }
    const errorMessage = 'Some specifiers failed to claim'
    if (aaoError) {
      throw new Errors.AntiAbuseOracleAttestationError(
        aaoError.code,
        errorMessage
      )
    }
    throw new Error(errorMessage)
  }
}

function* claimChallengeRewardAsync(
  action: ReturnType<typeof claimChallengeReward>
) {
  try {
    yield* call(claimSingleChallengeRewardAsync, action)
    yield* put(claimChallengeRewardSucceeded())
  } catch (e) {
    if (e instanceof Errors.AntiAbuseOracleAttestationError) {
      yield* put(claimChallengeRewardFailed({ aaoErrorCode: e.code }))
    } else {
      yield* put(claimChallengeRewardFailed())
    }
  }
}

function* claimAllChallengeRewardsAsync(
  action: ReturnType<typeof claimAllChallengeRewards>
) {
  const { claims } = action.payload
  let hasError = false
  let aaoErrorCode: undefined | number
  const { track, make } = yield* getContext('analytics')
  yield* call(
    track,
    make({ eventName: Name.REWARDS_CLAIM_ALL_REQUEST, count: claims.length })
  )
  yield* all(
    claims.map((claim) =>
      call(function* () {
        try {
          yield* call(claimSingleChallengeRewardAsync, {
            type: claimChallengeReward.type,
            payload: { claim, retryOnFailure: false }
          })
        } catch (e) {
          hasError = true
          if (e instanceof Errors.AntiAbuseOracleAttestationError) {
            aaoErrorCode = e.code
          }
        }
      })
    )
  )
  if (aaoErrorCode !== undefined) {
    yield* put(claimChallengeRewardFailed({ aaoErrorCode }))
    yield* call(
      track,
      make({
        eventName: Name.REWARDS_CLAIM_ALL_BLOCKED,
        count: claims.length,
        code: aaoErrorCode
      })
    )
  } else if (hasError) {
    yield* put(claimChallengeRewardFailed())
    yield* call(
      track,
      make({ eventName: Name.REWARDS_CLAIM_ALL_FAILURE, count: claims.length })
    )
  } else {
    yield* put(claimAllChallengeRewardsSucceeded())
    yield* call(
      track,
      make({ eventName: Name.REWARDS_CLAIM_ALL_SUCCESS, count: claims.length })
    )
  }
}

function* watchSetHCaptchaStatus() {
  yield* takeLatest(
    setHCaptchaStatus.type,
    function* (action: ReturnType<typeof setHCaptchaStatus>) {
      const { status } = action.payload
      yield* call(retryClaimChallengeReward, {
        errorResolved: status === HCaptchaStatus.SUCCESS,
        retryOnFailure: true
      })
    }
  )
}

function* watchClaimChallengeReward() {
  yield* takeLatest(
    claimChallengeReward.type,
    function* (args: ReturnType<typeof claimChallengeReward>) {
      // Race the claim against the user clicking "close" on the modal,
      // so that the claim saga gets canceled if the modal is closed
      yield* race({
        task: call(claimChallengeRewardAsync, args),
        cancel: take(resetAndCancelClaimReward.type)
      })
    }
  )
}

function* watchClaimAllChallengeRewards() {
  yield* takeLatest(
    claimAllChallengeRewards.type,
    claimAllChallengeRewardsAsync
  )
}

function* fetchUserChallengesAsync() {
  yield* call(waitForRead)
  const sdk = yield* getSDK()
  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) return

  try {
    const { data: challengesData = [] } = yield* call(
      [sdk.users, sdk.users.getUserChallenges],
      {
        id: Id.parse(currentUserId)
      }
    )

    // Fetch monthly play counts from 2025
    const { data: monthlyPlays = {} } = yield* call(
      [sdk.users, sdk.users.getUserMonthlyTrackListens],
      {
        id: Id.parse(currentUserId),
        startTime: '2025-01-01',
        // Making the end time one year from the current date since the challenge is technically never ending
        endTime: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          .toISOString()
          .split('T')[0]
      }
    )

    const totalPlaysOnOwnedTracks = Object.values(monthlyPlays).reduce(
      (sum, month) => sum + (month.totalListens || 0),
      0
    )

    let userChallenges = challengesData.map(userChallengeFromSDK)

    // Only update play count milestone challenges if they exist and there are plays
    if (
      userChallenges.some((challenge) =>
        isPlayCountChallenge(challenge.challenge_id)
      )
    ) {
      userChallenges = userChallenges.map((challenge) => {
        if (isPlayCountChallenge(challenge.challenge_id)) {
          return {
            ...challenge,
            current_step_count: Math.max(
              challenge.current_step_count,
              totalPlaysOnOwnedTracks
            )
          }
        }
        return challenge
      })
    }

    const { data = [] } = yield* call(
      [sdk.challenges, sdk.challenges.getUndisbursedChallenges],
      {
        userId: Id.parse(currentUserId),
        limit: 500
      }
    )
    const undisbursedChallenges = data.map(undisbursedUserChallengeFromSDK)

    yield* put(fetchUserChallengesSucceeded({ userChallenges }))
    yield* put(setUndisbursedChallenges(undisbursedChallenges))
  } catch (e) {
    console.error(e)
    yield* put(fetchUserChallengesFailed())
  }
}

function* checkForNewDisbursements(
  action: ReturnType<typeof fetchUserChallengesSucceeded>
) {
  const queryClient = yield* getContext('queryClient')
  const { userChallenges } = action.payload
  if (!userChallenges) {
    return
  }
  const prevChallenges = yield* select(getUserChallengeSpecifierMap)
  const challengesOverrides = yield* select(getUserChallengesOverrides)
  let newDisbursement = false

  for (const challenge of userChallenges) {
    const prevChallenge =
      prevChallenges[challenge.challenge_id]?.[challenge.specifier]
    const challengeOverrides = challengesOverrides[challenge.challenge_id]

    // Check for new disbursements
    const wasNotPreviouslyDisbursed =
      prevChallenge && !prevChallenge.is_disbursed
    const wasNotDisbursedThisSession =
      !challengeOverrides || !challengeOverrides.is_disbursed
    if (
      challenge.is_disbursed &&
      wasNotPreviouslyDisbursed &&
      wasNotDisbursedThisSession
    ) {
      newDisbursement = true
    }
  }
  if (newDisbursement) {
    // Trigger a refetch for all audio balances
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.audioBalance]
    })

    yield* put(showMusicConfetti())
    yield* put(showRewardClaimedToast())
  }
}

function* watchFetchUserChallengesSucceeded() {
  yield* takeEvery(
    fetchUserChallengesSucceeded.type,
    function* (action: ReturnType<typeof fetchUserChallengesSucceeded>) {
      yield* call(checkForNewDisbursements, action)
      yield* call(handleOptimisticChallengesOnUpdate, action)
    }
  )
}

function* watchFetchUserChallenges() {
  yield* takeEvery(fetchUserChallenges.type, function* () {
    yield* call(fetchUserChallengesAsync)
  })
}

/**
 * Resets the listen streak override if current_step_count is fetched and non-zero
 * This handles the case where API can reset the user's listen streak
 */
function* handleOptimisticListenStreakUpdate(
  challenge: UserChallenge,
  challengeOverrides?: Partial<UserChallenge>
) {
  if (
    (challengeOverrides?.current_step_count ?? 0) > 0 &&
    challenge.current_step_count !== 0
  ) {
    yield* put(
      resetUserChallengeCurrentStepCount({
        challengeId: challenge.challenge_id
      })
    )
  }
}

/**
 * Handles challenge override updates on user challenge updates
 */
function* handleOptimisticChallengesOnUpdate(
  action: ReturnType<typeof fetchUserChallengesSucceeded>
) {
  const { userChallenges } = action.payload
  if (!userChallenges) {
    return
  }

  const challengesOverrides = yield* select(getUserChallengesOverrides)

  for (const challenge of userChallenges) {
    if (challenge.challenge_id === 'listen-streak') {
      yield* call(
        handleOptimisticListenStreakUpdate,
        challenge,
        challengesOverrides[challenge.challenge_id]
      )
    }
  }
}

/**
 * Updates the listen streak optimistically if current_step_count is zero and a track is played
 */
function* watchUpdateOptimisticListenStreak() {
  yield* takeEvery(updateOptimisticListenStreak.type, function* () {
    const listenStreakChallenge = yield* select(getUserChallenge, {
      challengeId: 'listen-streak'
    })
    if (listenStreakChallenge?.current_step_count === 0) {
      yield* put(
        setUserChallengeCurrentStepCount({
          challengeId: 'listen-streak',
          stepCount: 1
        })
      )
    }
  })
}

/**
 * Updates the play count challenges optimistically when a user plays their own track
 * All three play count challenges (p1, p2, p3) will show the same play count value
 */
function* watchUpdateOptimisticPlayCount() {
  yield* takeEvery(updateOptimisticPlayCount.type, function* () {
    // Define array of play count milestone challenge IDs
    const playCountChallengeIds = [
      ChallengeName.PlayCount250,
      ChallengeName.PlayCount1000,
      ChallengeName.PlayCount10000
    ]

    // Iterate through each challenge ID
    for (const challengeId of playCountChallengeIds) {
      // Get the challenge
      const challenge = yield* select(getUserChallenge, { challengeId })

      // If the challenge exists, increment its step count
      if (challenge) {
        yield* put(
          setUserChallengeCurrentStepCount({
            challengeId,
            stepCount: challenge.current_step_count + 1
          })
        )
      }
    }
  })
}

function* watchUpdateHCaptchaScore() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  yield* takeEvery(
    updateHCaptchaScore.type,
    function* (action: ReturnType<typeof updateHCaptchaScore>): any {
      const { token } = action.payload
      const userId = yield* call(queryCurrentUserId)
      if (!userId) {
        yield* put(setHCaptchaStatus({ status: HCaptchaStatus.ERROR }))
        return
      }
      const result = yield* call(audiusBackendInstance.updateHCaptchaScore, {
        sdk,
        token
      })
      if (result.error) {
        yield* put(setHCaptchaStatus({ status: HCaptchaStatus.ERROR }))
      } else {
        yield* put(setHCaptchaStatus({ status: HCaptchaStatus.SUCCESS }))
      }
    }
  )
}

function* pollUserChallenges(frequency: number) {
  while (true) {
    yield* put(fetchUserChallenges())
    yield* call(delay, frequency)
  }
}

function* userChallengePollingDaemon() {
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')

  const isNativeMobile = yield* getContext('isNativeMobile')

  yield* call(remoteConfigInstance.waitForRemoteConfig)
  const defaultChallengePollingTimeout = remoteConfigInstance.getRemoteVar(
    IntKeys.CHALLENGE_REFRESH_INTERVAL_MS
  )!
  const audioRewardsPageChallengePollingTimeout =
    remoteConfigInstance.getRemoteVar(
      IntKeys.CHALLENGE_REFRESH_INTERVAL_AUDIO_PAGE_MS
    )!

  yield* take(fetchAccountSucceeded.type)
  if (!isNativeMobile) {
    yield* fork(function* () {
      yield* call(visibilityPollingDaemon, fetchUserChallenges())
    })
  }

  yield* call(
    foregroundPollingDaemon,
    fetchUserChallenges(),
    defaultChallengePollingTimeout,
    {
      [AUDIO_PAGE]: audioRewardsPageChallengePollingTimeout
    }
  )
}

const sagas = () => {
  const sagas = [
    watchFetchUserChallenges,
    watchFetchUserChallengesSucceeded,
    watchClaimChallengeReward,
    watchClaimAllChallengeRewards,
    watchSetHCaptchaStatus,
    watchUpdateHCaptchaScore,
    userChallengePollingDaemon,
    watchUpdateOptimisticListenStreak,
    watchUpdateOptimisticPlayCount
  ]
  return sagas
}

export default sagas
