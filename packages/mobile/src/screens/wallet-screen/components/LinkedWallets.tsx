import { useCallback, useMemo, useState } from 'react'

import type { ConnectedWallet } from '@audius/common/api'
import {
  useAssociatedWallets,
  useRemoveAssociatedWallet
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
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
  Paper,
  Text,
  Skeleton,
  Divider,
  useTheme,
  LoadingSpinner
} from '@audius/harmony-native'
import ActionDrawer, {
  type ActionDrawerRow
} from 'app/components/action-drawer/ActionDrawer'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { useToast } from 'app/hooks/useToast'

const WALLET_ROW_HEIGHT = 52

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
        <Text variant='body' size='m' strength='strong'>
          {walletMessages.linkedWallets.linkedWallet(index)}
        </Text>
      </Flex>
      <Flex flex={1}>
        <Text variant='body' size='m' strength='strong' color='subdued'>
          {shortenSPLAddress(address)}
        </Text>
      </Flex>
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
    <Paper>
      {/* Header Section */}
      <Flex gap='xl' p='l'>
        <Flex row alignItems='center' gap='s'>
          <Text variant='heading' size='s' color='heading'>
            {hasWallets
              ? walletMessages.linkedWallets.titleHasWallets
              : walletMessages.linkedWallets.titleNoWallets}
          </Text>
          {hasWallets && !isLoading ? (
            <Text variant='heading' size='s' color='subdued'>
              {walletMessages.linkedWallets.count(walletCount)}
            </Text>
          ) : null}
        </Flex>
      </Flex>
      <Divider />

      {/* Wallet Stack Section */}
      {isLoading ? (
        <WalletLoadingState />
      ) : hasWallets ? (
        <WalletRowsList connectedWallets={connectedWallets} />
      ) : (
        <WalletEmptyState />
      )}
      <Divider />

      {/* Footer Section with Add Button */}
      <Flex p='l'>
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
