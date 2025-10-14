import { Chain, Status } from '@audius/common/models'
import type { AssociatedWallet } from '@audius/common/store'
import { tokenDashboardPageSelectors } from '@audius/common/store'
import { FlatList, View } from 'react-native'
import { useSelector } from 'react-redux'

import { Divider, Flex, Text } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { makeStyles } from 'app/styles'

import { LinkedWallet } from './LinkedWallet'

const { getAssociatedWallets, getRemoveWallet } = tokenDashboardPageSelectors

const messages = {
  linkedWallets: 'Linked Wallet',
  audio: '$AUDIO',
  copied: 'Copied To Clipboard!'
}

const useStyles = makeStyles(({ spacing }) => ({
  root: {
    marginTop: spacing(6),
    flex: 1
  },
  linkedWalletsHeader: {
    paddingHorizontal: spacing(6),
    flexDirection: 'row'
  },
  linkedWalletsText: {
    flex: 6
  },
  audioAmountText: {
    flex: 2,
    textAlign: 'right'
  },
  gap: {
    flex: 2
  }
}))

type LinkedWalletData = AssociatedWallet & {
  chain: Chain
  isConfirming?: boolean
}

export const LinkedWallets = () => {
  const styles = useStyles()

  const {
    loadingStatus,
    errorMessage,
    confirmingWallet,
    connectedEthWallets = [],
    connectedSolWallets
  } = useSelector(getAssociatedWallets)

  const removeWallets = useSelector(getRemoveWallet)

  const ethWallets =
    connectedEthWallets?.map((wallet) => ({ ...wallet, chain: Chain.Eth })) ??
    []

  const solWallets =
    connectedSolWallets?.map((wallet) => ({ ...wallet, chain: Chain.Sol })) ??
    []

  const wallets: LinkedWalletData[] = [...ethWallets, ...solWallets]

  if (confirmingWallet && confirmingWallet.wallet && confirmingWallet.chain) {
    wallets.push({
      chain: confirmingWallet.chain,
      address: confirmingWallet.wallet,
      balance: confirmingWallet.balance ?? BigInt(0),
      isConfirming: true
    })
  }

  if (!(wallets.length > 0)) {
    return null
  }

  return (
    <View style={styles.root}>
      <View style={styles.linkedWalletsHeader}>
        <Text
          style={styles.linkedWalletsText}
          size='m'
          variant='label'
          color='subdued'
        >
          {messages.linkedWallets}
        </Text>
        <Text
          style={styles.audioAmountText}
          size='m'
          variant='label'
          color='subdued'
        >
          {messages.audio}
        </Text>
        <View style={styles.gap} />
      </View>
      <Divider mv='m' />
      {loadingStatus === Status.SUCCESS ? (
        <FlatList
          renderItem={({ item }) => (
            <LinkedWallet
              chain={item.chain}
              address={item.address}
              audioBalance={item.balance}
              isLoading={Boolean(
                removeWallets.wallet === item.address || item.isConfirming
              )}
            />
          )}
          data={wallets}
          ItemSeparatorComponent={() => <Divider mv='m' />}
        />
      ) : loadingStatus === Status.IDLE || loadingStatus === Status.LOADING ? (
        <Flex alignSelf='center'>
          <LoadingSpinner style={{ width: 40, height: 40 }} />
        </Flex>
      ) : null}
      {errorMessage && (
        <Flex alignSelf='center'>
          <Text variant='body' color='danger'>
            {errorMessage}
          </Text>
        </Flex>
      )}
    </View>
  )
}
