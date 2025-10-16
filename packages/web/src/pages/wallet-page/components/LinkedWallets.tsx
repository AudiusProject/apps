import { useCallback, useContext, useMemo, useState } from 'react'

import {
  useAssociatedWallets,
  useRemoveAssociatedWallet,
  ConnectedWallet
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { Chain } from '@audius/common/models'
import { shortenSPLAddress, WALLET_COUNT_LIMIT } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconCopy,
  IconTrash,
  IconButton,
  IconKebabHorizontal,
  IconLogoCircleETH,
  IconLogoCircleSOL,
  Paper,
  PopupMenu,
  PopupMenuItem,
  Text,
  Skeleton,
  Divider,
  useTheme,
  LoadingSpinner
} from '@audius/harmony'

import { ToastContext } from 'components/toast/ToastContext'
import { copyToClipboard } from 'utils/clipboardUtil'
import { NEW_WALLET_CONNECTED_TOAST_TIMEOUT_MILLIS } from 'utils/constants'

import {
  AlreadyAssociatedError,
  useConnectAndAssociateWallets
} from '../../../hooks/useConnectAndAssociateWallets'

const COPIED_TOAST_TIMEOUT = 2000

type WalletRowProps = {
  address: string
  chain: Chain
  isInAppWallet?: boolean
  index: number
}

type WalletRowContentProps = {
  address: string
  chain: Chain
  isInAppWallet?: boolean
  index: number
  isRemovingWallet: boolean
  items: PopupMenuItem[]
}

const WalletRowContent = ({
  address,
  chain,
  index,
  isRemovingWallet,
  items
}: WalletRowContentProps) => {
  return (
    <Flex
      alignItems='center'
      gap='m'
      w='100%'
      css={{ opacity: isRemovingWallet ? 0.5 : 1 }}
      justifyContent='space-between'
    >
      <Flex alignItems='center' gap='s'>
        {chain === Chain.Eth ? <IconLogoCircleETH /> : <IconLogoCircleSOL />}
        <Text variant='body' size='m' strength='strong'>
          {walletMessages.linkedWallets.linkedWallet(index)}
        </Text>
        <Text variant='body' size='m' strength='strong' color='subdued'>
          {shortenSPLAddress(address)}
        </Text>
      </Flex>
      {isRemovingWallet ? (
        <LoadingSpinner />
      ) : (
        <PopupMenu
          items={items}
          aria-disabled={isRemovingWallet}
          renderTrigger={(ref, trigger) => (
            <IconButton
              ref={ref}
              icon={IconKebabHorizontal}
              size='s'
              color='subdued'
              disabled={isRemovingWallet}
              onClick={() => trigger()}
              aria-label={walletMessages.linkedWallets.options}
            />
          )}
        />
      )}
    </Flex>
  )
}

const WalletRow = ({
  address,
  chain,
  isInAppWallet = false,
  index
}: WalletRowProps) => {
  const { toast } = useContext(ToastContext)
  const [isRemovingWallet, setIsRemovingWallet] = useState(false)

  const copyAddressToClipboard = useCallback(() => {
    copyToClipboard(address)
    toast(walletMessages.linkedWallets.copied, COPIED_TOAST_TIMEOUT)
  }, [address, toast])

  const { mutateAsync: removeConnectedWalletAsync } =
    useRemoveAssociatedWallet()

  const handleRemove = useCallback(async () => {
    try {
      setIsRemovingWallet(true)
      await removeConnectedWalletAsync({
        wallet: { address, chain }
      })
    } finally {
      setIsRemovingWallet(false)
    }
  }, [removeConnectedWalletAsync, address, chain])

  const items: PopupMenuItem[] = useMemo(
    () =>
      [
        {
          text: walletMessages.linkedWallets.copy,
          icon: <IconCopy />,
          onClick: copyAddressToClipboard
        },
        !isInAppWallet
          ? {
              text: walletMessages.linkedWallets.remove,
              icon: <IconTrash />,
              onClick: handleRemove
            }
          : null
      ].filter(Boolean) as PopupMenuItem[],
    [copyAddressToClipboard, handleRemove, isInAppWallet]
  )

  return (
    <WalletRowContent
      address={address}
      chain={chain}
      isInAppWallet={isInAppWallet}
      index={index}
      isRemovingWallet={isRemovingWallet}
      items={items}
    />
  )
}

const WalletLoadingState = () => {
  const { spacing } = useTheme()
  return (
    <Flex column alignItems='center' gap='l' w='100%' pv='m' ph='xl' pb='l'>
      <Skeleton w='100%' h={spacing.unit8} />
      <Skeleton w='100%' h={spacing.unit8} />
      <Skeleton w='100%' h={spacing.unit8} />
    </Flex>
  )
}

const WalletRowsList = ({
  connectedWallets
}: {
  connectedWallets?: ConnectedWallet[]
}) => (
  <Flex column gap='xl' w='100%' pv='l' ph='l'>
    {connectedWallets?.map((wallet, index) => (
      <WalletRow
        key={wallet.address}
        address={wallet.address}
        chain={wallet.chain}
        index={index}
      />
    ))}
  </Flex>
)

const WalletEmptyState = ({
  openAppKitModal,
  isPending
}: {
  openAppKitModal: () => void
  isPending: boolean
}) => {
  return (
    <Flex column pv='m' ph='l' w='100%' gap='l'>
      <Text variant='body' size='m' color='subdued'>
        {walletMessages.linkedWallets.linkWallet}
      </Text>
      <Button
        fullWidth
        variant='secondary'
        size='small'
        onClick={() => {
          openAppKitModal()
        }}
        isLoading={isPending}
        disabled={isPending}
      >
        {walletMessages.linkedWallets.addWallet}
      </Button>
    </Flex>
  )
}

export const LinkedWallets = () => {
  const { data: connectedWallets, isLoading } = useAssociatedWallets()
  const { toast } = useContext(ToastContext)

  const hasWallets = !!connectedWallets?.length
  const walletCount = connectedWallets?.length ?? 0

  const handleAddWalletSuccess = useCallback(async () => {
    toast(
      walletMessages.linkedWallets.newWalletConnected,
      NEW_WALLET_CONNECTED_TOAST_TIMEOUT_MILLIS
    )
  }, [toast])

  const handleAddWalletError = useCallback(
    async (e: unknown) => {
      if (e instanceof AlreadyAssociatedError) {
        toast(walletMessages.linkedWallets.walletAlreadyAdded)
      } else {
        toast(walletMessages.linkedWallets.error)
      }
    },
    [toast]
  )

  const { openAppKitModal, isPending: isConnectingWallets } =
    useConnectAndAssociateWallets(handleAddWalletSuccess, handleAddWalletError)

  const isAtOrAboveLimit = walletCount >= WALLET_COUNT_LIMIT

  return (
    <Paper
      column
      alignItems='flex-start'
      backgroundColor='white'
      borderRadius='m'
    >
      <Flex column pv='l' ph='l' w='100%'>
        <Flex alignItems='center' justifyContent='space-between' w='100%'>
          <Flex alignItems='center' gap='s'>
            <Text variant='heading' size='m' color='heading'>
              {hasWallets
                ? walletMessages.linkedWallets.titleHasWallets
                : walletMessages.linkedWallets.titleNoWallets}
            </Text>
            {hasWallets && !isLoading ? (
              <Text variant='heading' size='m' color='subdued'>
                {walletMessages.linkedWallets.count(walletCount)}
              </Text>
            ) : null}
          </Flex>
          {hasWallets && !isLoading ? (
            <Button
              variant='secondary'
              size='small'
              onClick={() => {
                openAppKitModal()
              }}
              isLoading={isConnectingWallets}
              disabled={isConnectingWallets || isAtOrAboveLimit}
            >
              {walletMessages.linkedWallets.addWallet}
            </Button>
          ) : null}
        </Flex>
      </Flex>
      <Divider css={{ width: '100%' }} />

      {isLoading ? (
        <WalletLoadingState />
      ) : hasWallets ? (
        <WalletRowsList connectedWallets={connectedWallets} />
      ) : (
        <WalletEmptyState
          openAppKitModal={openAppKitModal}
          isPending={isConnectingWallets}
        />
      )}
    </Paper>
  )
}
