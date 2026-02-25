import { useCallback } from 'react'

import { useRemoteVar } from '@audius/common/hooks'
import { StringKeys } from '@audius/common/services'
import {
  audioRewardsPageSelectors,
  audioRewardsPageActions,
  modalsActions
} from '@audius/common/store'
import type { TrendingRewardsModalType } from '@audius/common/store'
import type { ImageStyle } from 'react-native'
import { Image, ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconArrowRight, Button } from '@audius/harmony-native'
import BarChart from 'app/assets/images/emojis/chart-bar.png'
import ChartIncreasing from 'app/assets/images/emojis/chart-increasing.png'
import { SegmentedControl, Text, GradientText, Link } from 'app/components/core'
import TweetEmbed from 'app/components/tweet-embed'
import { useNavigation } from 'app/hooks/useNavigation'
import type { AppScreenParamList } from 'app/screens/app-screen'
import { makeStyles } from 'app/styles'
import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

import { AppDrawer, useDrawerState } from '../drawer/AppDrawer'
const { getTrendingRewardsModalType } = audioRewardsPageSelectors
const { setTrendingRewardsModalType } = audioRewardsPageActions
const { setVisibility } = modalsActions

const TRENDING_REWARDS_DRAWER_NAME = 'TrendingRewardsExplainer'
const TOS_URL = 'https://blog.audius.co/article/audio-rewards'

const messages = {
  tracksTitle: 'Top 5 Tracks Each Week Receive 1000 $AUDIO',
  undergroundTitle: 'Top 5 Tracks Each Week Receive 1000 $AUDIO',
  winners: 'Top 5 winners are selected every Friday at Noon PT!',
  lastWeek: "LAST WEEK'S WINNERS",
  tracks: 'Tracks',
  underground: 'Underground',
  terms: 'Terms and Conditions Apply',
  tracksModalTitle: 'Top 5 Trending Tracks',
  undergroundModalTitle: 'Top 5 Underground Trending Tracks',
  buttonTextTracks: 'Trending Tracks',
  buttonTextUnderground: 'Underground Trending Tracks'
}

const textMap = {
  tracks: {
    modalTitle: messages.tracksModalTitle,
    title: messages.tracksTitle,
    button: messages.buttonTextTracks,
    icon: ChartIncreasing
  },
  underground: {
    modalTitle: messages.undergroundModalTitle,
    title: messages.undergroundTitle,
    button: messages.buttonTextUnderground,
    icon: BarChart
  }
}

const useStyles = makeStyles(({ spacing, typography }) => ({
  content: {
    height: '100%',
    width: '100%',
    paddingBottom: spacing(8)
  },
  modalTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing(8),
    marginTop: spacing(2),
    marginBottom: spacing(4)
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: typography.fontSize.xxl
  },
  chartEmoji: {
    height: 24,
    width: 24,
    marginTop: spacing(1),
    marginRight: spacing(3)
  },
  titles: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: spacing(8),
    marginTop: spacing(8)
  },
  subtitle: {
    fontSize: 13
  },
  trendingControl: {
    marginHorizontal: 28
  },
  lastWeek: {
    textAlign: 'center',
    marginBottom: spacing(4),
    fontSize: spacing(6)
  },
  buttonContainer: {
    marginTop: spacing(4),
    marginHorizontal: spacing(4),
    marginBottom: spacing(2)
  },
  terms: {
    marginBottom: spacing(4),
    textAlign: 'center',
    width: '100%',
    textDecorationLine: 'underline'
  }
}))

// Getters and setters for whether we're looking at
// trending playlists or trending tracks
const useRewardsType = (): [
  TrendingRewardsModalType,
  (type: TrendingRewardsModalType) => void
] => {
  const dispatch = useDispatch()
  const rewardsType = useSelector(getTrendingRewardsModalType)
  const setTrendingRewardsType = useCallback(
    (type: TrendingRewardsModalType) => {
      dispatch(setTrendingRewardsModalType({ modalType: type }))
    },
    [dispatch]
  )
  return [rewardsType ?? 'tracks', setTrendingRewardsType]
}

const useTweetId = (type: TrendingRewardsModalType) => {
  const tracksId = useRemoteVar(StringKeys.REWARDS_TWEET_ID_TRACKS)
  const undergroundId = useRemoteVar(StringKeys.REWARDS_TWEET_ID_UNDERGROUND)
  return {
    tracks: tracksId,
    underground: undergroundId
  }[type]
}

const useIsDark = () => {
  const themeVariant = useThemeVariant()
  return isDarkTheme(themeVariant)
}

export const TrendingRewardsDrawer = (titleIcon) => {
  const dispatch = useDispatch()
  const navigation = useNavigation<AppScreenParamList>()
  const { onClose } = useDrawerState(TRENDING_REWARDS_DRAWER_NAME)
  const styles = useStyles()
  const [modalType, setModalType] = useRewardsType()
  const isDark = useIsDark()

  const tweetId = useTweetId(modalType)

  const handleClose = useCallback(() => {
    dispatch(
      setVisibility({ modal: TRENDING_REWARDS_DRAWER_NAME, visible: 'closing' })
    )
  }, [dispatch])

  const tabOptions = [
    {
      key: 'tracks',
      text: messages.tracks
    },
    {
      key: 'underground',
      text: messages.underground
    }
  ]

  const handleGoToTrending = useCallback(() => {
    switch (modalType) {
      case 'tracks': {
        navigation.navigate('trending', { screen: 'Trending' })
        break
      }
      case 'underground': {
        navigation.navigate('trending', { screen: 'Trending' })
        break
      }
    }
    onClose()
  }, [modalType, navigation, onClose])

  return (
    <AppDrawer
      modalName={TRENDING_REWARDS_DRAWER_NAME}
      isFullscreen
      isGestureSupported={false}
      titleIcon={titleIcon}
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.modalTitleContainer}>
          <Image
            style={styles.chartEmoji as ImageStyle}
            source={textMap[modalType].icon}
          />
          <GradientText style={styles.modalTitle}>
            {textMap[modalType].modalTitle}
          </GradientText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.trendingControl}>
            <SegmentedControl
              fullWidth
              options={tabOptions}
              selected={modalType}
              onSelectOption={(option) =>
                setModalType(option as TrendingRewardsModalType)
              }
              key={`rewards-slider-${tabOptions.length}`}
            />
          </View>
          <View style={styles.titles}>
            <Text variant='h3' color='secondary'>
              {textMap[modalType].title}
            </Text>
            <Text style={styles.subtitle} weight='bold' color='neutralLight4'>
              {messages.winners}
            </Text>
          </View>

          <GradientText style={styles.lastWeek}>
            {messages.lastWeek}
          </GradientText>
          <TweetEmbed
            // Refresh it when we toggle
            key={`x-${tweetId}`}
            tweetId={tweetId}
            options={{
              theme: isDark ? 'dark' : 'light',
              cards: 'none',
              conversation: 'none',
              hide_thread: true
            }}
          />

          <View style={styles.buttonContainer}>
            <Button
              variant='primary'
              iconRight={IconArrowRight}
              fullWidth
              onPress={handleGoToTrending}
            >
              {textMap[modalType].button}
            </Button>
          </View>
          <Link url={TOS_URL}>
            <Text style={styles.terms} variant='body2'>
              {messages.terms}
            </Text>
          </Link>
        </ScrollView>
      </View>
    </AppDrawer>
  )
}
