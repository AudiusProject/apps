import { useEffect, useMemo, useState } from 'react'

import { useCurrentAccountUser, useCurrentAccount } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { ChallengeName } from '@audius/common/src/models/AudioRewards'
import {
  audioRewardsPageActions,
  audioRewardsPageSelectors,
  ChallengeRewardsModalType,
  challengesSelectors,
  CommonState
} from '@audius/common/store'
import {
  makeOptimisticChallengeSortComparator,
  removeNullable
} from '@audius/common/utils'
import { Box, Flex, Text } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { useSetVisibility } from 'common/hooks/useModalState'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
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
  const optimisticUserChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const [haveChallengesLoaded, setHaveChallengesLoaded] = useState(false)
  const { isEnabled: isClaimAllRewardsEnabled } = useFeatureFlag(
    FeatureFlags.CLAIM_ALL_REWARDS_TILE
  )

  // The referred challenge only needs a tile if the user was referred
  const hideReferredTile = !userChallenges[ChallengeName.Referred]?.is_complete
  const rewardIds = useRewardIds({
    [ChallengeName.Referred]: hideReferredTile
  })

  useEffect(() => {
    if (!userChallengesLoading && !haveChallengesLoaded) {
      setHaveChallengesLoaded(true)
    }
  }, [userChallengesLoading, haveChallengesLoaded])

  useEffect(() => {
    // Refresh user challenges on page visit
    dispatch(fetchUserChallenges())
  }, [dispatch])

  const openModal = (modalType: ChallengeRewardsModalType) => {
    dispatch(setChallengeRewardsModalType({ modalType }))
    setVisibility('ChallengeRewards')(true)
  }

  const rewardIdsSorted = useMemo(
    () =>
      rewardIds
        // Filter out challenges that DN didn't return
        .map((id) => userChallenges[id]?.challenge_id)
        .filter(removeNullable)
        .sort(makeOptimisticChallengeSortComparator(optimisticUserChallenges)),
    [rewardIds, optimisticUserChallenges, userChallenges]
  )

  const rewardsTiles = rewardIdsSorted.map((id) => {
    const props = getChallengeConfig(id)
    return <RewardPanel {...props} openModal={openModal} key={props.id} />
  })

  const wm = useWithMobileStyle(styles.mobile)

  return (
    <Flex column gap='l'>
      {isClaimAllRewardsEnabled ? <ClaimAllRewardsPanel /> : null}
      <Tile className={wm(styles.rewardsTile, className)}>
        <Text variant='display' size='s' className={wm(styles.title)}>
          {messages.title}
        </Text>
        <Box mb='3xl'>
          <Text variant='body' strength='strong' size='l'>
            {messages.description1}
          </Text>
        </Box>
        {userChallengesLoading && !haveChallengesLoaded ? (
          <LoadingSpinner className={wm(styles.loadingRewardsTile)} />
        ) : (
          <>
            <div className={styles.rewardsContainer}>{rewardsTiles}</div>
          </>
        )}
      </Tile>
    </Flex>
  )
}
