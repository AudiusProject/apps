import { useEffect, useMemo, useState } from 'react'

import {
  useCurrentAccountUser,
  useCurrentAccount,
  useAccountStatus
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import {
  ChallengeName,
  ChallengeRewardID
} from '@audius/common/src/models/AudioRewards'
import { REWARDS_PAGE, SETTINGS_PAGE } from '@audius/common/src/utils/route'
import {
  audioRewardsPageActions,
  audioRewardsPageSelectors,
  ChallengeRewardsModalType,
  challengesSelectors,
  CommonState,
  useTierAndVerifiedForUser
} from '@audius/common/store'
import {
  challengeRewardsConfig,
  convertHexToRGBA,
  isRewardOpenToAll,
  makeOptimisticChallengeSortComparator
} from '@audius/common/utils'
import {
  Box,
  Flex,
  IconCaretRight,
  IconLock,
  IconVerified,
  PlainButton,
  SelectablePill,
  Text,
  useTheme
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { useSetVisibility } from 'common/hooks/useModalState'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useIsMobile } from 'hooks/useIsMobile'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'
import { getChallengeConfig } from 'pages/rewards-page/config'

import styles from '../../RewardsTile.module.css'
import { messages } from '../../messages'
import { ClaimAllRewardsPanel } from '../ClaimAllRewardsPanel'
import { Tile } from '../Tile'

import { RewardPanel } from './RewardPanel'
import { useRewardIds } from './hooks/useRewardIds'

const { getUserChallenges, getUserChallengesLoading } =
  audioRewardsPageSelectors
const { fetchUserChallenges, setChallengeRewardsModalType } =
  audioRewardsPageActions
const { getOptimisticUserChallenges } = challengesSelectors

type ChallengeRewardsTileProps = {
  className?: string
}

export const ChallengeRewardsTile = ({
  className
}: ChallengeRewardsTileProps) => {
  const setVisibility = useSetVisibility()
  const dispatch = useDispatch()
  const userChallengesLoading = useSelector(getUserChallengesLoading)
  const userChallenges = useSelector(getUserChallenges)
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const { data: accountStatus } = useAccountStatus()
  const isAuthLoading =
    accountStatus === Status.LOADING || accountStatus === Status.IDLE
  const isAuthenticated = !isAuthLoading && !!currentUser
  const optimisticUserChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const [haveChallengesLoaded, setHaveChallengesLoaded] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const remoteConfigRewardIds = useRewardIds({})
  const navigate = useNavigate()
  const { spacing, color } = useTheme()
  const { isVerified } = useTierAndVerifiedForUser(currentUser?.user_id)
  const lockedRewardsOverlayColor =
    typeof color.background.white === 'string' &&
    color.background.white.startsWith('#')
      ? convertHexToRGBA(color.background.white, 0.15)
      : 'color-mix(in srgb, var(--harmony-bg-white) 15%, transparent)'

  useEffect(() => {
    if (!userChallengesLoading && !haveChallengesLoaded) {
      setHaveChallengesLoaded(true)
    }
  }, [userChallengesLoading, haveChallengesLoaded])

  useEffect(() => {
    dispatch(fetchUserChallenges())
  }, [dispatch])

  const openModal = useRequiresAccountCallback(
    (modalType: ChallengeRewardsModalType) => {
      dispatch(setChallengeRewardsModalType({ modalType }))
      setVisibility('ChallengeRewards')(true)
    },
    [dispatch, setVisibility],
    undefined,
    REWARDS_PAGE
  )

  const rewardIdsSorted = useMemo(() => {
    if (!isAuthenticated) {
      return remoteConfigRewardIds.filter(
        (id) =>
          id !== ChallengeName.Referred && !!challengeRewardsConfig[id]?.title
      )
    }

    const allRewardIds = Object.keys(userChallenges).filter((id) => {
      const challengeId = id as ChallengeRewardID
      if (!challengeRewardsConfig[challengeId]?.title) {
        return false
      }
      if (challengeId === ChallengeName.Referred) {
        return userChallenges[challengeId]?.is_complete === true
      }
      return true
    }) as ChallengeRewardID[]

    return allRewardIds.sort(
      makeOptimisticChallengeSortComparator(optimisticUserChallenges)
    )
  }, [
    isAuthenticated,
    remoteConfigRewardIds,
    optimisticUserChallenges,
    userChallenges
  ])

  const filteredRewardIds = useMemo(() => {
    if (!isAuthenticated || showCompleted) {
      return rewardIdsSorted
    }
    return rewardIdsSorted.filter((id) => {
      const challenge = optimisticUserChallenges[id]
      if (!challenge) return true
      const hasDisbursed =
        challenge.state === 'disbursed' ||
        (challenge.challenge_id === ChallengeName.OneShot &&
          challenge.disbursed_amount > 0)
      return !hasDisbursed
    })
  }, [
    isAuthenticated,
    rewardIdsSorted,
    optimisticUserChallenges,
    showCompleted
  ])

  const { allRewardsSorted, openToAllRewards, verifiedOnlyRewards } =
    useMemo(() => {
      if (isVerified) {
        const allRewards = [...filteredRewardIds].sort(
          makeOptimisticChallengeSortComparator(optimisticUserChallenges)
        )
        return {
          allRewardsSorted: allRewards,
          openToAllRewards: [],
          verifiedOnlyRewards: []
        }
      } else {
        const openToAll: typeof filteredRewardIds = []
        const verifiedOnly: typeof filteredRewardIds = []

        filteredRewardIds.forEach((id) => {
          if (isRewardOpenToAll(id)) {
            openToAll.push(id)
          } else {
            verifiedOnly.push(id)
          }
        })

        return {
          allRewardsSorted: [],
          openToAllRewards: openToAll,
          verifiedOnlyRewards: verifiedOnly
        }
      }
    }, [filteredRewardIds, isVerified, optimisticUserChallenges])

  const hasLockedRewards = !isVerified && verifiedOnlyRewards.length > 0

  const allRewardsTiles = isVerified
    ? allRewardsSorted.map((id) => {
        const props = getChallengeConfig(id)
        return <RewardPanel {...props} openModal={openModal} key={props.id} />
      })
    : []

  const openToAllTiles = !isVerified
    ? openToAllRewards.map((id) => {
        const props = getChallengeConfig(id)
        return <RewardPanel {...props} openModal={openModal} key={props.id} />
      })
    : []

  const verifiedOnlyTiles = !isVerified
    ? verifiedOnlyRewards.map((id) => {
        const props = getChallengeConfig(id)
        return (
          <RewardPanel
            {...props}
            openModal={openModal}
            key={props.id}
            isLocked={hasLockedRewards}
          />
        )
      })
    : []

  const wm = useWithMobileStyle(styles.mobile)
  const isMobile = useIsMobile()

  return (
    <Flex column gap='l'>
      <ClaimAllRewardsPanel />
      <Tile className={wm(styles.rewardsTile, className)}>
        <Flex
          css={{
            position: 'relative',
            marginBottom: spacing['3xl'],
            width: '100%',
            paddingTop: isMobile ? spacing.m : 0
          }}
        >
          <Flex column gap='s' alignItems='center' flex={1}>
            <Text variant='display' size='s' className={wm(styles.title)}>
              {messages.title}
            </Text>
            <Text
              variant='body'
              strength='strong'
              size='l'
              textAlign='center'
              className={wm(styles.tileSubtitle)}
            >
              {messages.description1}
            </Text>
          </Flex>
          {isVerified ? (
            <Box
              css={{
                position: 'absolute',
                top: isMobile ? -12 : 0,
                right: isMobile ? -12 : 0
              }}
            >
              <SelectablePill
                type='button'
                label={showCompleted ? 'Hide Completed' : 'Show Completed'}
                isSelected={showCompleted}
                onClick={() => setShowCompleted(!showCompleted)}
              />
            </Box>
          ) : null}
        </Flex>
        {isAuthLoading ||
        (isAuthenticated && userChallengesLoading && !haveChallengesLoaded) ? (
          <LoadingSpinner className={wm(styles.loadingRewardsTile)} />
        ) : (
          <>
            {isVerified && allRewardsTiles.length > 0 && (
              <div className={styles.rewardsContainer}>{allRewardsTiles}</div>
            )}
            {!isVerified && openToAllTiles.length > 0 && (
              <div className={styles.rewardsContainer}>{openToAllTiles}</div>
            )}
            {hasLockedRewards && (
              <Box
                css={{
                  position: 'relative',
                  marginTop: spacing.l,
                  maxHeight: '360px',
                  overflow: 'hidden'
                }}
              >
                <div
                  className={styles.rewardsContainer}
                  aria-hidden
                  style={{ pointerEvents: 'none' }}
                >
                  {verifiedOnlyTiles}
                </div>
                <Flex
                  column
                  alignItems='center'
                  justifyContent='center'
                  gap='l'
                  ph='xl'
                  css={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: lockedRewardsOverlayColor,
                    backdropFilter: 'blur(5px)',
                    borderRadius: spacing.l,
                    zIndex: 10,
                    pointerEvents: 'auto'
                  }}
                >
                  <Flex
                    pl='s'
                    gap='s'
                    alignItems='center'
                    border='default'
                    borderRadius='m'
                    backgroundColor='surface1'
                    css={{
                      overflow: 'hidden',
                      position: 'absolute',
                      top: spacing.m,
                      right: spacing.m
                    }}
                  >
                    <Text variant='body' size='s'>
                      Verification Required
                    </Text>
                    <Flex
                      ph='s'
                      pv='xs'
                      backgroundColor='surface2'
                      borderLeft='default'
                    >
                      <IconVerified size='s' />
                    </Flex>
                  </Flex>
                  <IconLock size='3xl' color='subdued' />
                  <Text
                    variant='body'
                    size='m'
                    textAlign='center'
                    strength='strong'
                  >
                    Get verified for access to even more rewards!
                  </Text>
                  <PlainButton
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(SETTINGS_PAGE)
                    }}
                    iconRight={IconCaretRight}
                  >
                    Settings
                  </PlainButton>
                </Flex>
              </Box>
            )}
            {!hasLockedRewards && verifiedOnlyTiles.length > 0 && (
              <div className={styles.rewardsContainer}>{verifiedOnlyTiles}</div>
            )}
          </>
        )}
      </Tile>
    </Flex>
  )
}
