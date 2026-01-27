import React, { useCallback, useEffect } from 'react'

import { useAudioBalance } from '@audius/common/api'
import { useRemoteVar } from '@audius/common/hooks'
import { StringKeys } from '@audius/common/services'
import { tokenDashboardPageActions } from '@audius/common/store'
import { useFocusEffect } from '@react-navigation/native'
import LinearGradient from 'react-native-linear-gradient'
import { useDispatch } from 'react-redux'

import { IconCrown, Flex, Text } from '@audius/harmony-native'
import { ScrollView, Screen, Tile, ScreenContent } from 'app/components/core'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { ChallengeRewardsTile } from './ChallengeRewardsTile'
import { ClaimAllRewardsTile } from './ClaimAllRewardsTile'
import { TiersTile } from './TiersTile'

const { fetchAssociatedWallets } = tokenDashboardPageActions

const messages = {
  title: 'Rewards & Perks',
  rewards: 'Earn Rewards',
  rewardsBody1: 'Complete tasks to earn $AUDIO tokens!'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  tiles: {
    height: '100%',
    padding: spacing(3)
  },
  tile: {
    borderRadius: 6,
    paddingVertical: spacing(8),
    paddingHorizontal: spacing(4)
  },
  tileRoot: {
    margin: spacing(3),
    padding: spacing(3)
  },
  tileHeader: {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.fontSize.xxl
  },
  tileSubheader: {
    fontFamily: typography.fontByWeight.demiBold,
    fontSize: typography.fontSize.medium,
    lineHeight: spacing(5),
    textAlign: 'center',
    marginBottom: spacing(6)
  },
  tileContent: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  },
  noticeTile: {
    padding: spacing(2)
  },
  noticeTileText: {
    color: palette.inverse
  }
}))

export const RewardsScreen = () => {
  const styles = useStyles()
  const { pageHeaderGradientColor1, pageHeaderGradientColor2 } =
    useThemeColors()
  const dispatch = useDispatch()
  const { toast } = useToast()
  const audioFeaturesDegradedText = useRemoteVar(
    StringKeys.AUDIO_FEATURES_DEGRADED_TEXT
  )

  const { isError: isAudioBalanceError } = useAudioBalance()

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchAssociatedWallets())
    }, [dispatch])
  )

  useEffect(() => {
    if (isAudioBalanceError) {
      toast({
        content: 'Balance failed to load. Please try again later.',
        type: 'error',
        timeout: 10000
      })
    }
  }, [isAudioBalanceError, toast])

  const renderNoticeTile = () => (
    <Tile
      as={LinearGradient}
      colors={[pageHeaderGradientColor1, pageHeaderGradientColor2]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      styles={{
        root: styles.tileRoot,
        tile: styles.noticeTile,
        content: styles.tileContent
      }}
    >
      <Text style={styles.noticeTileText}>{audioFeaturesDegradedText}</Text>
    </Tile>
  )

  return (
    <Screen
      url='/audio'
      variant='secondary'
      icon={IconCrown}
      title={messages.title}
    >
      <ScreenContent>
        <ScrollView style={styles.tiles}>
          <Flex gap='xl'>
            {audioFeaturesDegradedText ? renderNoticeTile() : null}
            <ClaimAllRewardsTile />
            <ChallengeRewardsTile />
            <TiersTile />
          </Flex>
        </ScrollView>
      </ScreenContent>
    </Screen>
  )
}
