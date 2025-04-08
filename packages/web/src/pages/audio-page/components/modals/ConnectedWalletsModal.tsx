import { useCallback, useContext, useState } from 'react'

import {
  useConnectedWallets,
  useRemoveConnectedWallet
} from '@audius/common/api'
import { Chain } from '@audius/common/models'
import { useConnectedWalletsModal } from '@audius/common/store'
import {
  Button,
  Flex,
  IconWallet,
  LoadingSpinner,
  Modal,
  ModalContentPages,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Text
} from '@audius/harmony'

import { ToastContext } from 'components/toast/ToastContext'
import { reportToSentry } from 'store/errors/reportToSentry'
import { NEW_WALLET_CONNECTED_TOAST_TIMEOUT_MILLIS } from 'utils/constants'

import {
  AlreadyAssociatedError,
  useConnectAndAssociateWallets
} from '../../../../hooks/useConnectAndAssociateWallets'
import WalletsTable, { WalletTableRow } from '../WalletsTable'

export const WALLET_COUNT_LIMIT = 5

const messages = {
  title: 'Connected Wallets',
  description:
    'Connect wallets to your account to display external $AUDIO balances and showcase NFT collectibles on your profile.',
  connect: 'Connect Wallet',
  limit: `Reached Limit of ${WALLET_COUNT_LIMIT} Connected Wallets.`,
  noConnected: 'You haven’t connected any wallets yet.',
  back: 'Back',
  newWalletConnected: 'New Wallet Successfully Connected!',
  walletRemoved: 'Wallet Successfully Removed!',
  warning: 'Are you sure you want to remove this wallet from your account?',
  remove: 'Remove Wallet',
  ignore: 'Nevermind',
  error: 'Something went wrong. Please try again.',
  walletAlreadyAdded: 'No new wallets selected to connect.'
}

enum Pages {
  TABLE = 0,
  CONFIRM_REMOVE_WALLET = 1
}

export const ConnectedWalletsModal = () => {
  const { isOpen, onClose, onClosed } = useConnectedWalletsModal()
  const { toast } = useContext(ToastContext)

  const [currentPage, setCurrentPage] = useState(Pages.TABLE)
  const [walletToRemove, setWalletToRemove] = useState<{
    address: string
    chain: Chain
  }>()

  const {
    data: connectedWallets,
    isPending,
    isError,
    error
  } = useConnectedWallets()

  const {
    mutateAsync: removeConnectedWalletAsync,
    isPending: isRemovePending
  } = useRemoveConnectedWallet()

  const handleRemoveClicked = useCallback(
    (wallet: { address: string; chain: Chain }) => {
      setWalletToRemove(wallet)
      setCurrentPage(Pages.CONFIRM_REMOVE_WALLET)
    },
    []
  )

  const handleRemoveConfirmed = useCallback(async () => {
    try {
      await removeConnectedWalletAsync({ wallet: walletToRemove! })
      setCurrentPage(Pages.TABLE)
      toast(messages.walletRemoved, NEW_WALLET_CONNECTED_TOAST_TIMEOUT_MILLIS)
    } catch (e) {
      toast(messages.error)
    }
  }, [removeConnectedWalletAsync, toast, walletToRemove])

  const handleIgnoreClicked = useCallback(() => setCurrentPage(Pages.TABLE), [])

  const handleAddWalletSuccess = useCallback(() => {
    toast(messages.newWalletConnected)
  }, [toast])

  const handleAddWalletError = useCallback(
    async (e: unknown) => {
      if (e instanceof AlreadyAssociatedError) {
        toast(messages.walletAlreadyAdded)
      } else {
        toast(messages.error)
        await reportToSentry({
          name: 'ConnectWallet',
          error:
            e instanceof Error
              ? e
              : new Error(
                  e instanceof Object && 'message' in e
                    ? (e.message as string)
                    : 'Unknown Error'
                ),
          additionalInfo: {
            raw: e
          }
        })
      }
    },
    [toast]
  )

  const { openAppKitModal, isPending: isConnectingWallets } =
    useConnectAndAssociateWallets(handleAddWalletSuccess, handleAddWalletError)

  const numConnectedWallets = connectedWallets?.length ?? 0
  const hasReachedLimit = numConnectedWallets >= WALLET_COUNT_LIMIT
  const isMutationPending = isConnectingWallets || isRemovePending
  const isConnectDisabled =
    hasReachedLimit || isMutationPending || isConnectingWallets

  return (
    <Modal
      size='small'
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
      dismissOnClickOutside={!isConnectingWallets}
    >
      <ModalHeader>
        <ModalTitle
          Icon={IconWallet}
          title={currentPage === Pages.TABLE ? messages.title : messages.remove}
        />
      </ModalHeader>
      <ModalContentPages currentPage={currentPage}>
        <Flex
          direction='column'
          justifyContent='center'
          alignItems='flex-start'
          gap='l'
        >
          <Text variant='body' size='m'>
            {messages.description}
          </Text>
          {isPending ? (
            <Flex alignItems='center' alignSelf='center'>
              <LoadingSpinner />
            </Flex>
          ) : numConnectedWallets === 0 && !isMutationPending ? (
            <Text variant='body' size='m' strength='strong'>
              {messages.noConnected}
            </Text>
          ) : (
            <WalletsTable
              renderWallet={(props) => (
                <WalletTableRow
                  key={props.address}
                  showActionMenu
                  {...props}
                  onRemove={handleRemoveClicked}
                />
              )}
            />
          )}
          {isError ? (
            <Text variant='body' color='danger'>
              {error.message}
            </Text>
          ) : null}
        </Flex>
        <Flex direction='column' gap='m' alignItems='center'>
          <Text strength='strong' color='danger' textAlign='center'>
            {messages.warning}
          </Text>
          <Text>{walletToRemove?.address}</Text>
        </Flex>
      </ModalContentPages>
      {currentPage === Pages.TABLE ? (
        <ModalFooter>
          <Button
            onClick={onClose}
            variant='secondary'
            isLoading={false}
            fullWidth
          >
            {messages.back}
          </Button>
          <Button
            variant='primary'
            disabled={isConnectDisabled}
            isLoading={isConnectingWallets}
            onClick={openAppKitModal}
            fullWidth
          >
            {messages.connect}
          </Button>
        </ModalFooter>
      ) : (
        <ModalFooter>
          <Button
            variant='destructive'
            isLoading={isRemovePending}
            disabled={isRemovePending}
            onClick={handleRemoveConfirmed}
          >
            {messages.remove}
          </Button>
          <Button variant='secondary' onClick={handleIgnoreClicked}>
            {messages.ignore}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  )
}
