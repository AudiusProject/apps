import { useRemoteVar } from '@audius/common/hooks'
import type { ChallengeRewardID } from '@audius/common/models'
import { StringKeys } from '@audius/common/services'
import type { TrendingRewardsModalType, Modals } from '@audius/common/store'
import { audioRewardsPageActions, modalsActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Flex, Paper, Text } from '@audius/harmony-native'
import { GradientText } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { getChallengeConfig } from 'app/utils/challenges'

import { Panel } from './Panel'
const { setVisibility } = modalsActions
const { setTrendingRewardsModalType } = audioRewardsPageActions

const messages = {
  trending: 'Competition Rewards',
  trendingBody1: 'Win contests to earn $AUDIO tokens!'
}

const validRewardIds: Set<ChallengeRewardID> = new Set([
  'trending-track',
  'top-api',
  'verified-upload',
  'trending-underground'
])

const useStyles = makeStyles(({ typography }) => ({
  tileHeader: {
    fontSize: typography.fontSize.xxl,
    textAlign: 'center',
    fontFamily: typography.fontByWeight.bold
  }
}))

/** Pulls rewards from remoteconfig */
const useRewardIds = () => {
  const rewardsString = useRemoteVar(StringKeys.TRENDING_REWARD_IDS)
  if (!rewardsString) return []
  const rewards = rewardsString.split(',') as ChallengeRewardID[]
  const filteredRewards: ChallengeRewardID[] = rewards.filter((reward) =>
    validRewardIds.has(reward)
  )
  return filteredRewards
}

export const TrendingRewards = () => {
  const dispatch = useDispatch()
  const rewardIds = useRewardIds()

  const openModal = (trendingRewardId: ChallengeRewardID) => {
    let modal: Modals
    let modalType: TrendingRewardsModalType | null = null
    switch (trendingRewardId) {
      case 'top-api':
        modal = 'APIRewardsExplainer'
        break
      case 'trending-track':
        modal = 'TrendingRewardsExplainer'
        modalType = 'tracks'
        break
      case 'trending-underground':
        modal = 'TrendingRewardsExplainer'
        modalType = 'underground'
        break
      case 'verified-upload':
      default:
        // Deprecated trending challenge
        return
    }
    if (modalType) {
      dispatch(setTrendingRewardsModalType({ modalType }))
    }
    dispatch(setVisibility({ modal, visible: true }))
  }

  const rewardsPanels = rewardIds.map((id) => {
    const props = getChallengeConfig(id)
    return <Panel {...props} onPress={() => openModal(id)} key={props.title} />
  })
  return <Flex gap='l'>{rewardsPanels}</Flex>
}

export const TrendingRewardsTile = () => {
  const styles = useStyles()
  return (
    <Paper
      shadow='near'
      border='strong'
      ph='s'
      pv='xl'
      alignItems='center'
      gap='2xl'
    >
      <Flex gap='s' alignItems='center'>
        <GradientText style={styles.tileHeader}>
          {messages.trending}
        </GradientText>
        <Text variant='body'>{messages.trendingBody1}</Text>
      </Flex>
      <TrendingRewards />
    </Paper>
  )
}
