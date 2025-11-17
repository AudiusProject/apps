import { useCallback, useMemo, useState } from 'react'

import type { ConnectedWallet } from '@audius/common/api'
import {
  useAssociatedWallets,
  useRemoveAssociatedWallet
} from '@audius/common/api'
import { coinDetailsMessages, walletMessages } from '@audius/common/messages'
import { Chain } from '@audius/common/models'
import { shortenSPLAddress, WALLET_COUNT_LIMIT } from '@audius/common/utils'
import Clipboard from '@react-native-clipboard/clipboard'

import {
  Button,
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconLogoCircleETH,
  IconLogoCircleSOL,
  IconLogoWhiteBackground,
  Paper,
  Text,
  Skeleton,
  useTheme,
  LoadingSpinner
} from '@audius/harmony-native'
import ActionDrawer, {
  type ActionDrawerRow
} from 'app/components/action-drawer/ActionDrawer'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'

const WALLET_ROW_HEIGHT = 56

type WalletRowProps = {
  address: string
  chain: Chain
  index: number
}

type WalletRowContentProps = {
  address: string
  chain: Chain
  index: number
  isRemovingWallet: boolean
  onOpenOverflowMenu: () => void
}

const WalletRowContent = ({
  address,
  chain,
  index,
  isRemovingWallet,
  onOpenOverflowMenu
}: WalletRowContentProps) => {
  return (
    <Flex
      row
      alignItems='center'
      gap='m'
      w='100%'
      ph='l'
      pv='m'
      h={WALLET_ROW_HEIGHT}
      style={{ opacity: isRemovingWallet ? 0.5 : 1 }}
    >
      <Flex row alignItems='center' gap='s'>
        {chain === Chain.Eth ? <IconLogoCircleETH /> : <IconLogoCircleSOL />}
        <Text>{shortenSPLAddress(address)}</Text>
      </Flex>
      <Flex flex={1} />
      {isRemovingWallet ? (
        <LoadingSpinner />
      ) : (
        <IconButton
          icon={IconKebabHorizontal}
          onPress={onOpenOverflowMenu}
          ripple
        />
      )}
    </Flex>
  )
}

const WalletRow = ({ address, chain, index }: WalletRowProps) => {
  const { onOpen } = useDrawer('WalletRowOverflowMenu')
  const [isRemovingWallet, setIsRemovingWallet] = useState(false)

  const handleOpenOverflowMenu = useCallback(() => {
    onOpen({
      address,
      chain,
      setIsRemovingWallet
    })
  }, [address, chain, onOpen, setIsRemovingWallet])

  return (
    <WalletRowContent
      address={address}
      chain={chain}
      index={index}
      isRemovingWallet={isRemovingWallet}
      onOpenOverflowMenu={handleOpenOverflowMenu}
    />
  )
}

export const WalletRowOverflowMenu = () => {
  const { data: drawerData } = useDrawer('WalletRowOverflowMenu')
  const { toast } = useToast()
  const { address, chain, setIsRemovingWallet } = drawerData ?? {}

  const { mutateAsync: removeConnectedWalletAsync } =
    useRemoveAssociatedWallet()

  const handleCopy = useCallback(() => {
    if (address) {
      Clipboard.setString(address)
      toast({ content: walletMessages.linkedWallets.copied, type: 'info' })
    }
  }, [address, toast])

  const handleRemove = useCallback(async () => {
    if (!address || !chain || !setIsRemovingWallet) return

    setIsRemovingWallet(true)
    await removeConnectedWalletAsync({
      wallet: { address, chain }
    })
    setIsRemovingWallet(false)
  }, [address, chain, setIsRemovingWallet, removeConnectedWalletAsync])

  const rows: ActionDrawerRow[] = useMemo(
    () => [
      {
        text: walletMessages.linkedWallets.copy,
        callback: handleCopy
      },
      {
        text: walletMessages.linkedWallets.remove,
        isDestructive: true,
        callback: handleRemove
      }
    ],
    [handleCopy, handleRemove]
  )

  return <ActionDrawer drawerName='WalletRowOverflowMenu' rows={rows} />
}

const WalletLoadingState = () => {
  const { spacing } = useTheme()
  return (
    <>
      <Flex mh='l' mt='l' gap='s' h={spacing.unit16}>
        <Skeleton h={spacing.unit12} />
      </Flex>
      <Flex mh='l' gap='s' h={spacing.unit16}>
        <Skeleton h={spacing.unit12} />
      </Flex>
    </>
  )
}

const WalletRowsList = ({
  connectedWallets
}: {
  connectedWallets?: ConnectedWallet[]
}) => (
  <>
    {connectedWallets?.map((wallet, index) => (
      <WalletRow
        key={wallet.address}
        address={wallet.address}
        chain={wallet.chain}
        index={index}
      />
    ))}
  </>
)

const WalletEmptyState = () => (
  <Flex p='l'>
    <Text variant='body' size='m' color='subdued'>
      {walletMessages.linkedWallets.linkWallet}
    </Text>
  </Flex>
)

const BuiltInWalletRow = () => {
  const theme = useTheme()

  return (
    <Flex
      row
      alignItems='center'
      gap='m'
      w='100%'
      ph='l'
      pv='m'
      h={WALLET_ROW_HEIGHT}
    >
      <Flex row alignItems='center' gap='s'>
        <IconLogoWhiteBackground
          style={{
            borderRadius: theme.cornerRadius.circle,
            borderColor: theme.color.border.default,
            height: theme.spacing.xl,
            width: theme.spacing.xl
          }}
        />
        <Text>{coinDetailsMessages.externalWallets.builtIn}</Text>
      </Flex>
    </Flex>
  )
}

export const LinkedWallets = () => {
  const navigation = useNavigation()
  const { data: connectedWallets, isLoading } = useAssociatedWallets()

  const hasWallets = !!connectedWallets?.length
  const walletCount = connectedWallets?.length ?? 0

  const handleAddWallet = useCallback(() => {
    navigation.navigate('ExternalWallets')
  }, [navigation])

  const isAtOrAboveLimit = walletCount >= WALLET_COUNT_LIMIT

  return (
    <Paper border='default'>
      {/* Header Section */}
      <Flex p='l' pb='m' borderBottom='default'>
        <Text variant='heading' size='s' color='default'>
          {walletMessages.linkedWallets.titleHasWallets}
        </Text>
      </Flex>

      {/* Built-In Wallet Row */}
      <BuiltInWalletRow />

      {/* Linked Wallets Section */}
      {isLoading ? (
        <WalletLoadingState />
      ) : hasWallets ? (
        <WalletRowsList connectedWallets={connectedWallets} />
      ) : (
        <WalletEmptyState />
      )}

      {/* Footer Section with Add Button */}
      <Flex p='l' pt='m' borderTop='default'>
        <Button
          variant='secondary'
          size='small'
          onPress={handleAddWallet}
          disabled={isAtOrAboveLimit}
          fullWidth
        >
          {walletMessages.linkedWallets.addWallet}
        </Button>
      </Flex>
    </Paper>
  )
}
