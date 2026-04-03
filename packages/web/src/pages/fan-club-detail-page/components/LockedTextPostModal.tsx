import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { useBuySellModal } from '@audius/common/store'
import {
  Button,
  Flex,
  IconArtistCoin,
  IconLock,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  Text
} from '@audius/harmony'

const messages = {
  howToUnlock: 'HOW TO UNLOCK',
  description: 'To unlock this post, you need to hold',
  buyCoins: 'Buy Coins'
}

type LockedTextPostModalProps = {
  isOpen: boolean
  onClose: () => void
  mint: string
}

export const LockedTextPostModal = ({
  isOpen,
  onClose,
  mint
}: LockedTextPostModalProps) => {
  const { data: coin } = useArtistCoin(mint)
  const { onOpen: openBuySellModal } = useBuySellModal()

  const handleBuyCoins = useCallback(() => {
    if (!coin?.ticker) return
    openBuySellModal({ isOpen: true, ticker: coin.ticker })
    onClose()
  }, [coin?.ticker, openBuySellModal, onClose])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='small'>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={messages.howToUnlock} icon={<IconLock />} />
      </ModalHeader>
      <ModalContent>
        <Flex column gap='l' alignItems='center' p='l'>
          <Text variant='body' size='l' textAlign='center'>
            {messages.description}{' '}
            {coin?.ticker ? (
              <Text variant='body' size='l' strength='strong'>
                ${coin.ticker}
              </Text>
            ) : (
              "the artist's coins"
            )}
            .
          </Text>
          <Button
            variant='primary'
            color='coinGradient'
            onClick={handleBuyCoins}
            iconLeft={IconArtistCoin}
            fullWidth
          >
            {messages.buyCoins}
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  )
}
