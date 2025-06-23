import { Chain } from '@audius/common/models'
import type { AssociatedWallet } from '@audius/common/store'
import {
  tokenDashboardPageSelectors,
  walletSelectors
} from '@audius/common/store'
import type { AudioWei } from '@audius/fixed-decimal'
import { AUDIO } from '@audius/fixed-decimal'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { GradientText } from 'app/components/core'
import { AppDrawer } from 'app/components/drawer'
import Text from 'app/components/text'
import { makeStyles } from 'app/styles'

import { Wallet } from './Wallet'
const { getAccountBalance } = walletSelectors
const { getAssociatedWallets } = tokenDashboardPageSelectors

const AUDIO_BREAKDOWN_MODAL_NAME = 'AudioBreakdown'

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  drawer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing(6),
    paddingTop: spacing(3),
    height: '100%'
  },
  amount: {
    fontSize: 48
  },
  total: {
    marginTop: spacing(2),
    marginBottom: spacing(6),
    fontSize: typography.fontSize.large,
    color: palette.neutralLight4
  },
  section: {
    width: '100%',
    marginBottom: spacing(6),
    padding: spacing(6),
    borderRadius: spacing(4),
    borderWidth: 2,
    borderColor: palette.neutralLight7,
    backgroundColor: palette.neutralLight10
  },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'center'
  },
  titleLabel: {
    fontSize: typography.fontSize.large,
    color: palette.neutral
  },
  titleAmount: {
    marginLeft: spacing(3),
    fontSize: typography.fontSize.large
  },
  sectionDescription: {
    marginTop: spacing(3)
  },
  description: {
    textAlign: 'center',
    textTransform: 'uppercase',
    color: palette.neutralLight4,
    fontSize: spacing(3)
  },
  walletsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing(6),
    paddingHorizontal: spacing(6),
    paddingBottom: 14,
    fontSize: spacing(4)
  },
  headerLabel: {
    color: palette.neutralLight4
  },
  walletsBody: {
    paddingLeft: spacing(6),
    paddingRight: spacing(6),
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight8
  }
}))

const messages = {
  modalTitle: '$AUDIO BREAKDOWN',
  total: 'TOTAL $AUDIO',
  audiusWallet: 'AUDIUS WALLET',
  audiusWalletDescription: 'You can use this $AUDIO throughout the app',
  linkedWallets: 'LINKED WALLETS',
  linkedWalletsDescription:
    'Linked wallets are more secure but not all features are supported',
  linkedWalletsTooltip:
    'Linked wallets affect VIP status and NFTs. Upcoming features may require different behavior to support linked wallets. ',
  audio: '$AUDIO'
}

export const AudioBreakdownDrawer = () => {
  const styles = useStyles()

  const accountBalance =
    useSelector(getAccountBalance, (a, b) => Boolean(a && b && a === b)) ??
    (BigInt(0) as AudioWei)

  const associatedWallets = useSelector(getAssociatedWallets)
  const { connectedEthWallets: ethWallets, connectedSolWallets: solWallets } =
    associatedWallets ?? {
      ethWallets: null,
      solWallets: null
    }

  const linkedWalletsBalance = (ethWallets ?? [])
    .concat(solWallets ?? [])
    .reduce((total, wallet) => {
      return total + BigInt(wallet.balance as unknown as string)
    }, BigInt(0)) as AudioWei

  const totalBalance = (accountBalance + linkedWalletsBalance) as AudioWei

  return (
    <AppDrawer
      modalName={AUDIO_BREAKDOWN_MODAL_NAME}
      title={messages.modalTitle}
      isFullscreen
    >
      <View style={styles.drawer}>
        <GradientText style={styles.amount}>
          {AUDIO(totalBalance).trunc().toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })}
        </GradientText>

        <Text style={styles.total} weight='bold'>
          {messages.total}
        </Text>

        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <Text style={styles.titleLabel} weight='bold'>
              {messages.audiusWallet}
            </Text>

            <GradientText style={styles.titleAmount}>
              {AUDIO(accountBalance).trunc().toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </GradientText>
          </View>

          <View style={styles.sectionDescription}>
            <Text style={styles.description} weight='bold'>
              {messages.audiusWalletDescription}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <Text style={styles.titleLabel} weight='bold'>
              {messages.linkedWallets}
            </Text>

            <GradientText style={styles.titleAmount}>
              {AUDIO(linkedWalletsBalance).trunc().toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </GradientText>
          </View>

          <View style={styles.walletsHeader}>
            <Text style={styles.headerLabel} weight='bold'>
              {messages.linkedWallets}
            </Text>
            <Text style={styles.headerLabel} weight='bold'>
              {messages.audio}
            </Text>
          </View>

          <View style={styles.walletsBody}>
            {ethWallets?.map((wallet: AssociatedWallet) => (
              <Wallet chain={Chain.Eth} key={wallet.address} {...wallet} />
            ))}
            {solWallets?.map((wallet: AssociatedWallet) => (
              <Wallet chain={Chain.Sol} key={wallet.address} {...wallet} />
            ))}
          </View>

          <View style={styles.sectionDescription}>
            <Text style={styles.description} weight='bold'>
              {messages.linkedWalletsDescription}
            </Text>
          </View>
        </View>
      </View>
    </AppDrawer>
  )
}
