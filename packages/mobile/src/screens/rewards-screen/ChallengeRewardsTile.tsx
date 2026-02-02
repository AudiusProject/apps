import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCurrentAccount, useCurrentAccountUser } from '@audius/common/api'
import { Name, ChallengeName } from '@audius/common/models'
import type { ChallengeRewardID } from '@audius/common/models'
import {
  challengesSelectors,
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  modalsActions,
  useTierAndVerifiedForUser
} from '@audius/common/store'
import type {
  ChallengeRewardsModalType,
  CommonState
} from '@audius/common/store'
import type { dayjs } from '@audius/common/utils'
import {
  isRewardOpenToAll,
  removeNullable,
  makeOptimisticChallengeSortComparator
} from '@audius/common/utils'
import { BlurView } from '@react-native-community/blur'
import { useFocusEffect } from '@react-navigation/native'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Flex,
  IconCaretRight,
  IconLock,
  IconVerified,
  PlainButton,
  SelectablePill,
  Text,
  Paper,
  useTheme
} from '@audius/harmony-native'
import { GradientText } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import type { SummaryTableItem } from 'app/components/summary-table/SummaryTable'
import { useNavigation } from 'app/hooks/useNavigation'
import type { ProfileTabScreenParamList } from 'app/screens/app-screen/ProfileTabScreen'
import { make, track } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import { getChallengeConfig } from 'app/utils/challenges'
import { Theme, useThemeVariant } from 'app/utils/theme'

import { Panel } from './Panel'
const { setVisibility } = modalsActions
const { getUserChallenges, getUserChallengesLoading } =
  audioRewardsPageSelectors
const { fetchUserChallenges, setChallengeRewardsModalType } =
  audioRewardsPageActions
const { getOptimisticUserChallenges } = challengesSelectors

type ClaimableSummaryTableItem = SummaryTableItem & {
  claimableDate: dayjs.Dayjs
  isClose: boolean
}

const messages = {
  title: 'Rewards',
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
  const navigation = useNavigation<ProfileTabScreenParamList>()
  const { spacing } = useTheme()
  const themeVariant = useThemeVariant()
  const isDarkMode =
    themeVariant === Theme.DARK || themeVariant === Theme.MATRIX
  const userChallengesLoading = useSelector(getUserChallengesLoading)
  const userChallenges = useSelector(getUserChallenges)
  const { data: currentAccount } = useCurrentAccount()
  const { data: currentUser } = useCurrentAccountUser()
  const optimisticUserChallenges = useSelector((state: CommonState) =>
    getOptimisticUserChallenges(state, currentAccount, currentUser)
  )
  const [haveChallengesLoaded, setHaveChallengesLoaded] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const { isVerified } = useTierAndVerifiedForUser(currentUser?.user_id)

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
    // Map trending reward IDs to ChallengeName enum values for modal
    let challengeName: ChallengeRewardsModalType = modalType
    if (modalType === ChallengeName.TrendingTrack) {
      challengeName = ChallengeName.TrendingTrack
    } else if (modalType === ChallengeName.TrendingUndergroundTrack) {
      challengeName = ChallengeName.TrendingUndergroundTrack
    } else if (modalType === ChallengeName.TrendingPlaylist) {
      challengeName = ChallengeName.TrendingPlaylist
    }

    dispatch(setChallengeRewardsModalType({ modalType: challengeName }))
    dispatch(setVisibility({ modal: 'ChallengeRewards', visible: true }))
  }

  // Get all reward IDs from API (like web does)
  const rewardIdsSorted = useMemo(() => {
    const allRewardIds = Object.keys(userChallenges).filter((id) => {
      const challengeId = id as ChallengeRewardID
      // The referred challenge only needs a tile if the user was referred
      if (challengeId === ChallengeName.Referred) {
        return userChallenges[challengeId]?.is_complete === true
      }
      // Include all other challenges
      return true
    }) as ChallengeRewardID[]

    return allRewardIds.sort(
      makeOptimisticChallengeSortComparator(optimisticUserChallenges)
    )
  }, [optimisticUserChallenges, userChallenges])

  // Filter completed rewards based on toggle
  const filteredRewardIds = useMemo(() => {
    if (showCompleted) {
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
  }, [rewardIdsSorted, optimisticUserChallenges, showCompleted])

  // When verified, combine all rewards and sort by claimability
  // When not verified, separate into open-to-all and verified-only
  const { allRewardsSorted, openToAllRewards, verifiedOnlyRewards } =
    useMemo(() => {
      if (isVerified) {
        // When verified, combine all rewards and sort by claimability
        const allRewards = [...filteredRewardIds].sort(
          makeOptimisticChallengeSortComparator(optimisticUserChallenges)
        )
        return {
          allRewardsSorted: allRewards,
          openToAllRewards: [],
          verifiedOnlyRewards: []
        }
      } else {
        // When not verified, separate into open-to-all and verified-only
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

  // Create panels for each reward type
  const allRewardsPanels = isVerified
    ? allRewardsSorted.map((id) => {
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
    : []

  const openToAllPanels = !isVerified
    ? openToAllRewards.map((id) => {
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
    : []

  const verifiedOnlyPanels = !isVerified
    ? verifiedOnlyRewards.map((id) => {
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
    : []

  return (
    <Paper shadow='near' border='strong' ph='s' pv='xl'>
      <Flex gap='unit10' alignItems='center'>
        <View
          style={{
            position: 'relative',
            width: '100%',
            marginBottom: spacing.l,
            paddingTop: spacing['2xl']
          }}
        >
          <Flex gap='s' alignItems='center'>
            <GradientText style={styles.title}>{messages.title}</GradientText>
            <Text textAlign='center'>{messages.subheader}</Text>
          </Flex>
          <View
            style={{
              position: 'absolute',
              top: -12,
              right: 0
            }}
          >
            <SelectablePill
              type='button'
              label={showCompleted ? 'Hide Completed' : 'Show Completed'}
              isSelected={showCompleted}
              onPress={() => setShowCompleted(!showCompleted)}
            />
          </View>
        </View>
        {userChallengesLoading && !haveChallengesLoaded ? (
          <LoadingSpinner style={styles.loading} />
        ) : (
          <>
            {isVerified && allRewardsPanels.length > 0 && (
              <Flex gap='s'>{allRewardsPanels}</Flex>
            )}
            {!isVerified && openToAllPanels.length > 0 && (
              <Flex gap='s'>{openToAllPanels}</Flex>
            )}
            {hasLockedRewards && (
              <View
                style={{
                  position: 'relative',
                  maxHeight: 360,
                  overflow: 'hidden',
                  width: '100%'
                }}
              >
                <Flex gap='s'>{verifiedOnlyPanels}</Flex>
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: spacing.l,
                    overflow: 'hidden'
                  }}
                >
                  <BlurView
                    blurType={isDarkMode ? 'dark' : 'light'}
                    blurAmount={10}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: spacing.xl,
                      gap: spacing.l
                    }}
                  >
                    <Flex
                      row
                      pl='s'
                      gap='s'
                      alignItems='center'
                      border='default'
                      borderRadius='m'
                      backgroundColor='surface1'
                      style={{
                        overflow: 'hidden',
                        position: 'absolute',
                        top: spacing.m,
                        right: spacing.m
                      }}
                    >
                      <Text variant='body' size='s'>
                        Required
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
                      onPress={() => {
                        navigation.push('AccountSettingsScreen')
                      }}
                      iconRight={IconCaretRight}
                    >
                      Settings
                    </PlainButton>
                  </View>
                </View>
              </View>
            )}
            {!hasLockedRewards && verifiedOnlyPanels.length > 0 && (
              <Flex gap='s'>{verifiedOnlyPanels}</Flex>
            )}
          </>
        )}
      </Flex>
    </Paper>
  )
}
