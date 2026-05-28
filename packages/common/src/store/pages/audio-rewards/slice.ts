import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import {
  UserChallenge,
  UndisbursedUserChallenge,
  ChallengeRewardID,
  Specifier,
  SpecifierWithAmount
} from '../../../models'

import {
  AudioRewardsClaim,
  ChallengeRewardsModalType,
  ClaimState,
  ClaimStatus,
  HCaptchaStatus,
  TrendingRewardsModalType
} from './types'

type UserChallengesPayload = {
  userChallenges: UserChallenge[] | null
}

type RewardsUIState = {
  loading: boolean
  trendingRewardsModalType: TrendingRewardsModalType
  challengeRewardsModalType: ChallengeRewardsModalType
  userChallenges: Partial<
    Record<ChallengeRewardID, Record<Specifier, UserChallenge>>
  >
  undisbursedChallenges: UndisbursedUserChallenge[]
  userChallengesOverrides: Partial<
    Record<ChallengeRewardID, Partial<UserChallenge>>
  >
  disbursedChallenges: Partial<Record<ChallengeRewardID, Specifier[]>>
  claimState: ClaimState
  claimToRetry?: AudioRewardsClaim
  hCaptchaStatus: HCaptchaStatus
  showRewardClaimedToast: boolean
}

const initialState: RewardsUIState = {
  trendingRewardsModalType: 'tracks',
  challengeRewardsModalType: 'track-upload',
  userChallenges: {},
  undisbursedChallenges: [],
  userChallengesOverrides: {},
  disbursedChallenges: {},
  loading: true,
  claimState: { status: ClaimStatus.NONE },
  hCaptchaStatus: HCaptchaStatus.NONE,
  showRewardClaimedToast: false
}

const slice = createSlice({
  name: 'rewards-page',
  initialState,
  reducers: {
    fetchUserChallenges: (_state) => {},
    fetchUserChallengesSucceeded: (
      state,
      action: PayloadAction<UserChallengesPayload>
    ) => {
      const { userChallenges } = action.payload
      if (userChallenges === null) {
        state.userChallenges = {}
      } else {
        state.userChallenges = userChallenges.reduce<
          Partial<Record<ChallengeRewardID, Record<Specifier, UserChallenge>>>
        >(
          (acc, challenge) => ({
            ...acc,
            [challenge.challenge_id]: {
              ...(acc[challenge.challenge_id] || {}),
              [challenge.specifier]: challenge
            }
          }),
          {}
        )
      }
      state.loading = false
    },
    fetchUserChallengesFailed: (state) => {
      state.loading = false
    },
    setUndisbursedChallenges: (
      state,
      action: PayloadAction<UndisbursedUserChallenge[]>
    ) => {
      if (state.undisbursedChallenges.length > 0 || action.payload.length > 0) {
        state.undisbursedChallenges = action.payload
      }
    },
    setUserChallengesDisbursed: (
      state,
      action: PayloadAction<{
        challengeId: ChallengeRewardID
        specifiers: SpecifierWithAmount[]
      }>
    ) => {
      const { challengeId, specifiers } = action.payload

      const userChallenge = Object.values(
        state.userChallenges[challengeId] || {}
      )[0]

      if (!userChallenge) return

      // Update disbursed specifiers
      state.disbursedChallenges[challengeId] = ([] as string[]).concat(
        state.disbursedChallenges[challengeId] ?? [],
        specifiers.map((s) => s.specifier)
      )

      // Keep track of individual challenges for rolled up aggregates
      if (userChallenge.challenge_type === 'aggregate') {
        // All completed challenges that are disbursed are fully disbursed
        if (userChallenge?.is_complete) {
          state.userChallengesOverrides[challengeId] = {
            ...state.userChallengesOverrides[challengeId],
            is_disbursed: true
          }
        }
        const newlyDisbursedAmount = specifiers.reduce(
          (acc, val) => acc + val.amount,
          0
        )
        const previouslyDisbursedAmount =
          state.userChallengesOverrides[challengeId]?.disbursed_amount ??
          userChallenge.disbursed_amount
        state.userChallengesOverrides[challengeId] = {
          ...state.userChallengesOverrides[challengeId],
          disbursed_amount: previouslyDisbursedAmount + newlyDisbursedAmount
        }
      } else {
        state.userChallengesOverrides[challengeId] = {
          ...state.userChallengesOverrides[challengeId],
          is_disbursed: true
        }
      }
    },
    updateOptimisticListenStreak: (_state) => {},
    updateOptimisticPlayCount: (_state) => {},
    setUserChallengeCurrentStepCount: (
      state,
      action: PayloadAction<{
        challengeId: ChallengeRewardID
        stepCount: number
      }>
    ) => {
      const { challengeId, stepCount } = action.payload
      state.userChallengesOverrides[challengeId] = {
        ...state.userChallengesOverrides[challengeId],
        current_step_count: stepCount
      }
    },
    resetUserChallengeCurrentStepCount: (
      state,
      action: PayloadAction<{
        challengeId: ChallengeRewardID
      }>
    ) => {
      const { challengeId } = action.payload
      const userChallengeOverride = state.userChallengesOverrides[challengeId]
      if (
        userChallengeOverride &&
        'current_step_count' in userChallengeOverride
      ) {
        delete userChallengeOverride.current_step_count
      }
    },
    setOptimisticChallengeCompleted: (
      state,
      action: PayloadAction<{
        challengeId: ChallengeRewardID
        specifier: string
      }>
    ) => {
      const { challengeId, specifier } = action.payload
      state.userChallengesOverrides[challengeId] = {
        ...state.userChallengesOverrides[challengeId],
        specifier,
        is_complete: true
      }
    },
    setTrendingRewardsModalType: (
      state,
      action: PayloadAction<{ modalType: TrendingRewardsModalType }>
    ) => {
      const { modalType } = action.payload
      state.trendingRewardsModalType = modalType
    },
    setChallengeRewardsModalType: (
      state,
      action: PayloadAction<{ modalType: ChallengeRewardsModalType }>
    ) => {
      const { modalType } = action.payload
      state.challengeRewardsModalType = modalType
    },
    setHCaptchaStatus: (
      state,
      action: PayloadAction<{ status: HCaptchaStatus }>
    ) => {
      const { status } = action.payload
      state.hCaptchaStatus = status
    },
    resetHCaptchaStatus: (state) => {
      state.hCaptchaStatus = HCaptchaStatus.NONE
    },
    updateHCaptchaScore: (
      _state,
      _action: PayloadAction<{ token: string }>
    ) => {},
    resetAndCancelClaimReward: (state) => {
      state.claimState = { status: ClaimStatus.NONE }
    },
    claimAllChallengeRewards: (
      state,
      _action: PayloadAction<{ claims: AudioRewardsClaim[] }>
    ) => {
      state.claimState = { status: ClaimStatus.CUMULATIVE_CLAIMING }
    },
    claimChallengeReward: (
      state,
      _action: PayloadAction<{
        claim: AudioRewardsClaim
        retryOnFailure: boolean
        retryCount?: number
      }>
    ) => {
      state.claimState = { status: ClaimStatus.CLAIMING }
    },
    claimChallengeRewardWaitForRetry: (
      state,
      action: PayloadAction<AudioRewardsClaim>
    ) => {
      state.claimState = { status: ClaimStatus.WAITING_FOR_RETRY }
      state.claimToRetry = action.payload
    },
    claimChallengeRewardFailed: (state) => {
      state.claimState = { status: ClaimStatus.ERROR }
    },
    claimChallengeRewardAlreadyClaimed: (state) => {
      state.claimState = { status: ClaimStatus.ALREADY_CLAIMED }
    },
    claimChallengeRewardSucceeded: (state) => {
      state.claimState = { status: ClaimStatus.SUCCESS }
    },
    claimAllChallengeRewardsSucceeded: (state) => {
      state.claimState = { status: ClaimStatus.CUMULATIVE_SUCCESS }
    },
    showRewardClaimedToast: (state) => {
      state.showRewardClaimedToast = true
    },
    resetRewardClaimedToast: (state) => {
      state.showRewardClaimedToast = false
    }
  }
})

export const {
  fetchUserChallenges,
  fetchUserChallengesSucceeded,
  fetchUserChallengesFailed,
  setUndisbursedChallenges,
  setTrendingRewardsModalType,
  setChallengeRewardsModalType,
  setUserChallengesDisbursed,
  resetAndCancelClaimReward,
  setHCaptchaStatus,
  resetHCaptchaStatus,
  updateHCaptchaScore,
  claimChallengeReward,
  claimAllChallengeRewards,
  claimChallengeRewardWaitForRetry,
  claimChallengeRewardAlreadyClaimed,
  claimChallengeRewardFailed,
  claimChallengeRewardSucceeded,
  claimAllChallengeRewardsSucceeded,
  showRewardClaimedToast,
  resetRewardClaimedToast,
  updateOptimisticListenStreak,
  updateOptimisticPlayCount,
  setUserChallengeCurrentStepCount,
  resetUserChallengeCurrentStepCount,
  setOptimisticChallengeCompleted
} = slice.actions

export default slice

export const actions = slice.actions
