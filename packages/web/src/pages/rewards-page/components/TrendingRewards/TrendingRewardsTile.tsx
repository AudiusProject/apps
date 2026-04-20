import { ChallengeRewardID } from '@audius/common/models'
import { REWARDS_PAGE } from '@audius/common/src/utils/route'
import { audioRewardsPageActions } from '@audius/common/store'
import { Box, Text } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { useSetVisibility } from 'common/hooks/useModalState'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'

import styles from '../../RewardsTile.module.css'
import { Tile } from '../../components/Tile'
import { getChallengeConfig } from '../../config'

import { RewardPanel } from './RewardPanel'
import { useRewardIds } from './hooks/useRewardIds'

const { setTrendingRewardsModalType } = audioRewardsPageActions

type TrendingRewardsTileProps = {
  className?: string
}

const messages = {
  title: 'Competition Rewards',
  description1: 'Win contests to earn $AUDIO tokens!'
}

export const TrendingRewardsTile = ({
  className
}: TrendingRewardsTileProps) => {
  const setVisibility = useSetVisibility()
  const dispatch = useDispatch()

  const openTrendingTracks = useRequiresAccountCallback(
    () => {
      dispatch(setTrendingRewardsModalType({ modalType: 'tracks' }))
      setVisibility('TrendingRewardsExplainer')(true)
    },
    [dispatch, setVisibility],
    undefined,
    REWARDS_PAGE
  )
  const openTrendingUnderground = useRequiresAccountCallback(
    () => {
      dispatch(setTrendingRewardsModalType({ modalType: 'underground' }))
      setVisibility('TrendingRewardsExplainer')(true)
    },
    [dispatch, setVisibility],
    undefined,
    REWARDS_PAGE
  )
  const openTopApi = useRequiresAccountCallback(
    () => setVisibility('APIRewardsExplainer')(true),
    [setVisibility],
    undefined,
    REWARDS_PAGE
  )
  const openVerifiedUpload = useRequiresAccountCallback(
    () => setVisibility('LinkSocialRewardsExplainer')(true),
    [setVisibility],
    undefined,
    REWARDS_PAGE
  )

  const callbacksMap: Partial<Record<ChallengeRewardID, () => void>> = {
    'trending-track': openTrendingTracks,
    'trending-underground': openTrendingUnderground,
    'top-api': openTopApi,
    'verified-upload': openVerifiedUpload
  }

  const rewardIds = useRewardIds()
  const wm = useWithMobileStyle(styles.mobile)

  if (rewardIds.length === 0) {
    return null
  }

  const rewardsTiles = rewardIds
    .map((id) => getChallengeConfig(id))
    .map((props) => (
      <RewardPanel
        {...props}
        onClickButton={callbacksMap[props.id] ?? (() => {})}
        key={props.id}
      />
    ))

  return (
    <Tile className={wm(styles.rewardsTile, className)}>
      <Text variant='display' size='s' className={wm(styles.title)}>
        {messages.title}
      </Text>
      <Box mb='3xl'>
        <Text variant='body' size='l' strength='strong'>
          {messages.description1}
        </Text>
      </Box>
      <div className={styles.rewardsContainer}>{rewardsTiles}</div>
    </Tile>
  )
}
