import { useCallback, useEffect, useState } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import { useRemoteVar } from '@audius/common/hooks'
import { Name, ChallengeName } from '@audius/common/models'
import type { ChallengeRewardID } from '@audius/common/models'
import { StringKeys } from '@audius/common/services'
import {
  challengesSelectors,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  modalsActions
} from '@audius/common/store'
import type {
  ChallengeRewardsModalType,
  CommonState
} from '@audius/common/store'
import type { dayjs } from '@audius/common/utils'
import {
  removeNullable,
  makeOptimisticChallengeSortComparator
} from '@audius/common/utils'
import { useFocusEffect } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, Text, Paper } from '@audius/harmony-native'
import { GradientText } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import type { SummaryTableItem } from 'app/components/summary-table/SummaryTable'
import { make, track } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import { getChallengeConfig } from 'app/utils/challenges'

import { Panel } from './Panel'
const { setVisibility } = modalsActions
const { getUserChallenges, getUserChallengesLoading } =
  audioRewardsPageSelectors
const { fetchUserChallenges, setChallengeRewardsModalType } =
  audioRewardsPageActions
const { getOptimisticUserChallenges } = challengesSelectors

const validRewardIds: Set<ChallengeRewardID> = new Set([
  'track-upload',
  'mobile-install',
  'connect-verified',
  'listen-streak',
  'profile-completion',
  'send-first-tip',
  'first-playlist',
  ChallengeName.AudioMatchingBuy, // $AUDIO matching buyer
  ChallengeName.AudioMatchingSell, // $AUDIO matching seller
  ChallengeName.ConnectVerified,
  ChallengeName.FirstPlaylist,
  ChallengeName.FirstTip,
  ChallengeName.ListenStreak,
  ChallengeName.ListenStreakEndless,
  ChallengeName.MobileInstall,
  ChallengeName.ProfileCompletion,
  ChallengeName.Referrals,
  ChallengeName.ReferralsVerified,
  ChallengeName.Referred,
  ChallengeName.TrackUpload,
  ChallengeName.OneShot,
  ChallengeName.FirstWeeklyComment,
  ChallengeName.PlayCount250,
  ChallengeName.PlayCount1000,
  ChallengeName.PlayCount10000,
  ChallengeName.Tastemaker,
  ChallengeName.Cosign,
  ChallengeName.CommentPin,
  ChallengeName.RemixContestWinner
])

type ClaimableSummaryTableItem = SummaryTableItem & {
  claimableDate: dayjs.Dayjs
  isClose: boolean
}

const messages = {
  title: 'Achievement Rewards',
  subheader: 'Earn $AUDIO by completing simple tasks while using Audius.',
  pending: 'Pending',
  claimAllRewards: 'Claim All Rewards',
  moreInfo: 'More Info',
  available: '$AUDIO available',
  now: 'now!',
  availableMessage: (summaryItems: ClaimableSummaryTableItem[]) => {
    const filteredSummaryItems = summaryItems.filter(removeNullable)
    const summaryItem = filteredSummaryItems.pop()
    const { value, label, claimableDate, isClose } = (summaryItem ??
      {}) as ClaimableSummaryTableItem
    if (isClose) {
      return `${value} ${messages.available} ${label}`
    }
    return (
      <Text>
        {value} {messages.available} {label}&nbsp;
        <Text color='subdued'>{claimableDate.format('(M/D)')}</Text>
      </Text>
    )
  }
}
/** Pulls rewards from remoteconfig */
const useRewardIds = (
  hideConfig: Partial<Record<ChallengeRewardID, boolean>>
) => {
  const rewardsString = useRemoteVar(StringKeys.CHALLENGE_REWARD_IDS)
  if (rewardsString === null) return []
  const rewards = rewardsString.split(',') as ChallengeRewardID[]
  const filteredRewards: ChallengeRewardID[] = rewards.filter(
    (reward) => validRewardIds.has(reward) && !hideConfig[reward]
  )
  return filteredRewards
}

const useStyles = makeStyles(({ spacing, typography, palette }) => ({
  title: {
    fontSize: typography.fontSize.xxl,
    textAlign: 'center',
    fontFamily: typography.fontByWeight.bold
  },
  loading: {
    marginVertical: spacing(2)
  }
}))

export const ChallengeRewardsTile = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const userChallengesLoading = useSelector(getUserChallengesLoading)
  const userChallenges = useSelector(getUserChallenges)
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const optimisticUserChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const [haveChallengesLoaded, setHaveChallengesLoaded] = useState(false)

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

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchUserChallenges())
    }, [dispatch])
  )

  const openModal = (modalType: ChallengeRewardsModalType) => {
    dispatch(setChallengeRewardsModalType({ modalType }))
    dispatch(setVisibility({ modal: 'ChallengeRewards', visible: true }))
  }

  const rewardsPanels = rewardIds
    // Filter out challenges that DN didn't return
    .map((id) => userChallenges[id]?.challenge_id)
    .filter(removeNullable)
    .sort(makeOptimisticChallengeSortComparator(optimisticUserChallenges))
    .map((id) => {
      const props = getChallengeConfig(id)
      const onPress = () => {
        openModal(id)
        track(
          make({
            eventName: Name.REWARDS_CLAIM_DETAILS_OPENED,
            challengeId: id
          })
        )
      }
      return (
        <Panel
          {...props}
          challenge={optimisticUserChallenges[id]}
          onPress={onPress}
          key={props.title}
        />
      )
    })

  return (
    <Paper shadow='near' border='strong' ph='s' pv='xl'>
      <Flex gap='unit10' alignItems='center'>
        <Flex gap='s'>
          <GradientText style={styles.title}>{messages.title}</GradientText>
          <Text textAlign='center'>{messages.subheader}</Text>
        </Flex>
        {userChallengesLoading && !haveChallengesLoaded ? (
          <LoadingSpinner style={styles.loading} />
        ) : (
          <Flex gap='s'>{rewardsPanels}</Flex>
        )}
      </Flex>
    </Paper>
  )
}
