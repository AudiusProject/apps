import { useCallback, useContext, useMemo, useState } from 'react'

import { useRemoveConnectedWallet } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { Chain } from '@audius/common/models'
import { useUserCoin } from '@audius/common/src/api/tan-query/coins/useUserCoin'
import { shortenSPLAddress } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconCopy,
  IconLogoCircleSOL,
  IconTrash,
  IconButton,
  IconKebabHorizontal,
  Paper,
  PopupMenu,
  PopupMenuItem,
  Text,
  Box,
  Skeleton,
  Divider,
  IconLogoWhiteBackground
} from '@audius/harmony'
import { UserCoinAccount } from '@audius/sdk'

import ActionDrawer from 'components/action-drawer/ActionDrawer'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { copyToClipboard } from 'utils/clipboardUtil'

import {
  AlreadyAssociatedError,
  useConnectAndAssociateWallets
} from '../../../hooks/useConnectAndAssociateWallets'

const COPIED_TOAST_TIMEOUT = 2000

const messages = coinDetailsMessages.externalWallets

type WalletRowProps = {
  mint: string
  decimals: number
} & UserCoinAccount

const WalletRow = ({
  owner,
  account,
  balance,
  isInAppWallet,
  decimals
}: WalletRowProps) => {
  const { toast } = useContext(ToastContext)
  const [isRemovingWallet, setIsRemovingWallet] = useState(false)
  const isMobile = useIsMobile()
  const [isMobileOverflowOpen, setIsMobileOverflowOpen] = useState(false)

  // For connected wallets we want to use the root wallet address, for in-app wallets the owner will be us and not the user so we need to use the token account address
  const address = isInAppWallet ? account : owner
  const copyAddressToClipboard = useCallback(() => {
    copyToClipboard(address)
    toast(messages.copied, COPIED_TOAST_TIMEOUT)
  }, [address, toast])

  const { mutateAsync: removeConnectedWalletAsync } = useRemoveConnectedWallet()

  const onOpenMobileOverflow = useCallback(() => {
    setIsMobileOverflowOpen(true)
  }, [setIsMobileOverflowOpen])

  const onCloseMobileOverflow = useCallback(() => {
    setIsMobileOverflowOpen(false)
  }, [setIsMobileOverflowOpen])

  const handleRemove = useCallback(async () => {
    setIsRemovingWallet(true)
    await removeConnectedWalletAsync({
      wallet: { address, chain: Chain.Sol }
    })
    setIsRemovingWallet(false)
  }, [removeConnectedWalletAsync, address])

  const items: PopupMenuItem[] = useMemo(
    () =>
      [
        {
          text: messages.copy,
          icon: <IconCopy color='default' />,
          onClick: copyAddressToClipboard
        },
        !isInAppWallet
          ? {
              text: messages.remove,
              icon: <IconTrash color='default' />,
              onClick: handleRemove
            }
          : null
      ].filter(Boolean) as PopupMenuItem[],
    [copyAddressToClipboard, handleRemove, isInAppWallet]
  )

  return (
    <Flex
      direction='row'
      alignItems='center'
      gap='m'
      w='100%'
      css={{ opacity: isRemovingWallet ? 0.5 : 1 }}
    >
      <Flex alignItems='center' gap='s'>
        {isInAppWallet ? (
          <Flex
            css={{
              borderRadius: '50%',
              overflow: 'hidden',
              border: '1px solid var(--harmony-n-100)',
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <IconLogoWhiteBackground size='l' />
          </Flex>
        ) : (
          <IconLogoCircleSOL />
        )}
        <Text variant='body' size='m' strength='strong'>
          {isInAppWallet ? messages.builtIn : shortenSPLAddress(address)}
        </Text>
      </Flex>
      <Flex css={{ flex: 1 }} justifyContent='flex-end'>
        <Text variant='body' size='m' strength='strong'>
          {Math.trunc(balance / Math.pow(10, decimals)).toLocaleString()}
        </Text>
      </Flex>
      {isMobile ? (
        <>
          <IconButton
            icon={IconKebabHorizontal}
            onClick={onOpenMobileOverflow}
            aria-label='More options'
          />
          <ActionDrawer
            actions={items.map((item) => ({
              text: item.text as string,
              icon: item.icon,
              onClick: (e) => {
                // @ts-ignore - Element vs HTMLElement
                item.onClick?.(e)
                onCloseMobileOverflow()
              }
            }))}
            isOpen={isMobileOverflowOpen}
            onClose={onCloseMobileOverflow}
          />
        </>
      ) : (
        <Flex
          css={{
            marginLeft: 'auto',
            flexBasis: 0
          }}
        >
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
                aria-label={messages.options}
              />
            )}
          />
        </Flex>
      )}
    </Flex>
  )
}

type ExternalWalletsProps = {
  mint: string
}

export const ExternalWallets = ({ mint }: ExternalWalletsProps) => {
  const { data: userCoins, isLoading } = useUserCoin({
    mint
  })
  const { accounts: unsortedAccounts = [], decimals } = userCoins ?? {}
  const accounts = useMemo(
    () => [...unsortedAccounts].sort((a, b) => b.balance - a.balance),
    [unsortedAccounts]
  )
  const { toast } = useContext(ToastContext)
  const hasAccounts = accounts.length > 0

  const handleAddWalletSuccess = useCallback(async () => {
    toast(messages.newWalletConnected)
  }, [toast])

  const handleAddWalletError = useCallback(
    async (e: unknown) => {
      if (e instanceof AlreadyAssociatedError) {
        toast(messages.walletAlreadyAdded)
      } else {
        toast(messages.error)
      }
    },
    [toast]
  )

  // app kit modal
  const { openAppKitModal, isPending: isConnectingWallets } =
    useConnectAndAssociateWallets(handleAddWalletSuccess, handleAddWalletError)

  return (
    <Paper
      direction='column'
      alignItems='flex-start'
      backgroundColor='white'
      borderRadius='m'
      border='default'
    >
      <Flex direction='column' pv='l' ph='l'>
        <Text variant='heading' size='s'>
          {hasAccounts ? messages.hasBalanceTitle : messages.noBalanceTitle}
        </Text>
      </Flex>
      <Divider css={{ width: '100%' }} />
      {!hasAccounts && !isLoading && (
        <Flex direction='column' pv='m' ph='l'>
          <Text variant='body' size='m' color='subdued'>
            {messages.description}
          </Text>
        </Flex>
      )}

      {hasAccounts ? (
        <Flex direction='column' gap='xl' w='100%' pv='l' ph='l'>
          {accounts?.map((walletAccount) => (
            <WalletRow
              key={walletAccount.owner}
              {...walletAccount}
              mint={mint}
              decimals={decimals ?? 0}
            />
          ))}
        </Flex>
      ) : isLoading ? (
        <Flex
          direction='column'
          alignItems='center'
          gap='s'
          w='100%'
          pv='m'
          ph='xl'
          pb='l'
        >
          <Skeleton w='100%' h='24px' />
        </Flex>
      ) : null}

      <Divider css={{ width: '100%' }} />
      <Box pv='l' ph='l' w='100%'>
        <Button
          variant='secondary'
          size='small'
          onClick={() => {
            openAppKitModal()
          }}
          isLoading={isConnectingWallets}
          disabled={isConnectingWallets}
          fullWidth
        >
          {messages.buttonText}
        </Button>
      </Box>
    </Paper>
  )
}
