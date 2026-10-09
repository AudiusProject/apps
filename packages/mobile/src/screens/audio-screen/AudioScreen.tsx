import React, { useCallback, useEffect } from 'react'

import { useAudioBalance } from '@audius/common/api'
import {
  modalsActions,
  tokenDashboardPageActions,
  tokenDashboardPageSelectors
} from '@audius/common/store'
import { formatNumberCommas, isNullOrUndefined } from '@audius/common/utils'
import { AUDIO } from '@audius/fixed-decimal'
import { useFocusEffect } from '@react-navigation/native'
import { Image, Linking } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useDispatch, useSelector } from 'react-redux'

import {
  LinearGradient,
  Button,
  Flex,
  IconCrown,
  IconInfo,
  Paper,
  Text,
  LoadingSpinner
} from '@audius/harmony-native'
import TokenStill from 'app/assets/images/tokenSpinStill.png'
import {
  GradientText,
  Screen,
  ScreenContent,
  ScrollView,
  Tile
} from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { ClaimAllRewardsTile } from '../rewards-screen/ClaimAllRewardsTile'

const { setVisibility } = modalsActions
const { getHasAssociatedWallets } = tokenDashboardPageSelectors
const { fetchAssociatedWallets } = tokenDashboardPageActions

const LEARN_MORE_LINK = 'https://blog.audius.co/article/community-meet-audio'

const messages = {
  title: '$AUDIO & Rewards',
  audio: '$AUDIO',
  send: 'Send',
  receive: 'Receive',
  externalWallets: 'External Wallets',
  what: 'What is $AUDIO?',
  whatBody1:
    'Audius is owned by people like you, not major corporations. Holding $AUDIO grants you partial ownership of the Audius platform and gives you access to special features as they are released.',
  learnMore: 'Learn More',
  totalReadyToClaim: 'Total Ready to Claim'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  tile: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: spacing(12),
    paddingBottom: spacing(14),
    paddingHorizontal: spacing(4)
  },
  tileContent: {
    justifyContent: 'center'
  },
  tileHeader: {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.fontSize.xxxxl
  },
  tileLink: {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.fontSize.xl,
    color: palette.secondary,
    marginVertical: spacing(4)
  },
  spinner: {
    width: spacing(16),
    height: spacing(16),
    marginBottom: spacing(3.5)
  },
  audioText: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontByWeight.bold,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
    textTransform: 'uppercase',
    marginRight: spacing(1)
  },
  token: {
    width: 200,
    height: 200,
    marginBottom: spacing(6),
    alignSelf: 'center'
  }
}))

export const AudioScreen = () => {
  const styles = useStyles()
  const { pageHeaderGradientColor1, pageHeaderGradientColor2 } =
    useThemeColors()
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { toast } = useToast()

  const {
    totalBalance,
    isLoading: isAudioBalanceLoading,
    isError: isAudioBalanceError
  } = useAudioBalance()

  const hasMultipleWallets = useSelector(getHasAssociatedWallets)

  const handlePressWalletInfo = useCallback(() => {
    dispatch(setVisibility({ modal: 'AudioBreakdown', visible: true }))
  }, [dispatch])

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

  const renderAudioTile = () => {
    return (
      <Paper shadow='near'>
        <Tile
          as={LinearGradient}
          colors={[pageHeaderGradientColor1, pageHeaderGradientColor2]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          styles={{
            tile: styles.tile,
            content: styles.tileContent
          }}
          onPress={hasMultipleWallets ? handlePressWalletInfo : undefined}
        >
          <Flex alignItems='center'>
            {isAudioBalanceLoading || isNullOrUndefined(totalBalance) ? (
              <LoadingSpinner
                fill={'rgba(255, 255, 255, 0.75)'}
                style={styles.spinner}
              />
            ) : (
              <Text
                variant='display'
                size='l'
                color='staticWhite'
                strength='strong'
              >
                {formatNumberCommas(
                  AUDIO(totalBalance).toLocaleString('en-US', {
                    maximumFractionDigits: 0
                  })
                )}
              </Text>
            )}
          </Flex>
          <Flex alignItems='center'>
            {hasMultipleWallets ? (
              <>
                <Text style={styles.audioText}>{messages.audio}</Text>
                <IconInfo
                  height={16}
                  width={16}
                  fill={'rgba(255,255,255,0.5)'}
                />
              </>
            ) : (
              <Text style={styles.audioText}>{messages.audio}</Text>
            )}
          </Flex>
        </Tile>
        <Flex
          pv='xl'
          ph='2xl'
          gap='m'
          border='strong'
          borderBottomLeftRadius='m'
          borderBottomRightRadius='m'
        >
          <Button variant='secondary' onPress={handlePressSend} fullWidth>
            {messages.send}
          </Button>
          <Button variant='secondary' onPress={handlePressReceive} fullWidth>
            {messages.receive}
          </Button>
          <Button
            variant='secondary'
            onPress={handlePressManageWallets}
            fullWidth
          >
            {messages.externalWallets}
          </Button>
        </Flex>
      </Paper>
    )
  }

  const handlePressSend = useCallback(() => {
    dispatch(
      setVisibility({ modal: 'TransferAudioMobileWarning', visible: true })
    )
  }, [dispatch])

  const handlePressReceive = useCallback(() => {
    dispatch(
      setVisibility({ modal: 'TransferAudioMobileWarning', visible: true })
    )
  }, [dispatch])

  const handlePressManageWallets = useCallback(() => {
    navigation.navigate('ExternalWallets')
  }, [navigation])

  const renderWhatTile = () => {
    return (
      <Paper shadow='near'>
        <Flex borderRadius='m' p='xl' gap='s' border='default'>
          <Image style={styles.token} source={TokenStill} />
          <GradientText style={styles.tileHeader}>{messages.what}</GradientText>
          <Text size='l'>{messages.whatBody1}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(LEARN_MORE_LINK)}
            activeOpacity={0.7}
          >
            <Text style={styles.tileLink}>{messages.learnMore}</Text>
          </TouchableOpacity>
        </Flex>
      </Paper>
    )
  }

  return (
    <Screen
      url='/audio'
      variant='secondary'
      icon={IconCrown}
      title={messages.title}
    >
      <ScreenContent>
        <ScreenPrimaryContent>
          <ScrollView>
            <Flex gap='l' mv='2xl' mh='m'>
              {renderAudioTile()}
              <ClaimAllRewardsTile />
              <ScreenSecondaryContent>
                {renderWhatTile()}
              </ScreenSecondaryContent>
            </Flex>
          </ScrollView>
        </ScreenPrimaryContent>
      </ScreenContent>
    </Screen>
  )
}
