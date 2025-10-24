import { useCallback } from 'react'

import { audioRewardsPageActions, modalsActions } from '@audius/common/store'
import LinearGradient from 'react-native-linear-gradient'
import { useDispatch } from 'react-redux'

import { IconCrown, Flex, Text, Paper, useTheme } from '@audius/harmony-native'
const { setVisibility } = modalsActions
const { setTrendingRewardsModalType } = audioRewardsPageActions

const messageMap = {
  tracks: {
    title: 'Global Trending: Weekly Top 5',
    description: 'Artists trending Fridays at 12PM PT win tokens!'
  },
  playlists: {
    title: 'Trending Playlists: Weekly Top 5',
    description: 'Playlists trending Fridays at 12PM PT win tokens!'
  },
  underground: {
    title: 'Underground Trending: Weekly Top 5',
    description: 'Artists trending Fridays at 12PM PT win tokens!'
  }
}

type RewardsBannerProps = {
  bannerType?: 'tracks' | 'playlists' | 'underground'
}

export const RewardsBanner = (props: RewardsBannerProps) => {
  const { bannerType = 'tracks' } = props
  const dispatch = useDispatch()
  const { color } = useTheme()

  const handlePress = useCallback(() => {
    dispatch(setTrendingRewardsModalType({ modalType: bannerType }))
    dispatch(
      setVisibility({ modal: 'TrendingRewardsExplainer', visible: true })
    )
  }, [dispatch, bannerType])

  // Get message content safely
  const messageContent = messageMap[bannerType] || messageMap.tracks

  return (
    <Paper m='l' mb={0} onPress={handlePress}>
      <LinearGradient
        {...color.special.gradient}
        style={{ width: '100%', borderRadius: 8 }}
      >
        <Flex direction='column' alignItems='center' ph='l' pv='m'>
          <Flex direction='row' alignItems='center' gap='xs'>
            <IconCrown size='s' color='staticWhite' />
            <Text variant='title' size='s' color='staticWhite'>
              {messageContent.title}
            </Text>
          </Flex>
          <Text
            variant='body'
            size='s'
            strength='strong'
            color='staticWhite'
            textAlign='center'
            style={{ opacity: 0.8 }}
          >
            {messageContent.description}
          </Text>
        </Flex>
      </LinearGradient>
    </Paper>
  )
}
