import { tokenDashboardPageActions } from '@audius/common/store'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useEffectOnce } from 'react-use'

import { IconClose, IconWallet } from '@audius/harmony-native'
import { Text, Screen, ScreenContent } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

import { TopBarIconButton } from '../app-screen'

import { ConnectNewWalletButton } from './ConnectNewWalletButton'
import { LinkedWallets } from './components'
import type { ExternalWalletsParamList } from './types'
import { usePhantomConnect } from './usePhantomConnect'
import { useWalletStatusToasts } from './useWalletStatusToasts'

const { fetchAssociatedWallets } = tokenDashboardPageActions

const messages = {
  title: 'Manage Wallets',
  subtitle: 'Connect Additional Wallets With Your Account',
  text: 'Show off your artist coins and flaunt your $AUDIO with a VIP badge on your profile.',
  linkedWallets: 'Linked Wallets',
  audio: '$AUDIO'
}

const useStyles = makeStyles(({ spacing, typography, palette }) => ({
  root: {
    paddingVertical: spacing(4),
    flex: 1
  },
  header: {
    marginHorizontal: spacing(6)
  },
  subtitle: {
    textAlign: 'center',
    fontSize: typography.fontSize.xxl,
    color: palette.secondary,
    marginVertical: spacing(6)
  },
  text: {
    marginHorizontal: spacing(4),
    textAlign: 'center',
    lineHeight: 24
  },
  connectButton: {
    marginTop: spacing(6)
  }
}))

export const ExternalWalletsScreen = () => {
  const styles = useStyles()
  const navigation = useNavigation<ExternalWalletsParamList>()
  const dispatch = useDispatch()
  useWalletStatusToasts()
  usePhantomConnect()

  useEffectOnce(() => {
    dispatch(fetchAssociatedWallets())
  })

  return (
    <Screen
      title={messages.title}
      icon={IconWallet}
      variant='white'
      topbarLeft={
        <TopBarIconButton icon={IconClose} onPress={navigation.goBack} />
      }
      url='/wallet-connect'
    >
      <ScreenContent>
        <View style={styles.root}>
          <View style={styles.header}>
            <Text weight='bold' style={styles.subtitle}>
              {messages.subtitle}
            </Text>
            <Text weight='medium' fontSize='medium' style={styles.text}>
              {messages.text}
            </Text>
          </View>
          <ConnectNewWalletButton />
          <LinkedWallets />
        </View>
      </ScreenContent>
    </Screen>
  )
}
