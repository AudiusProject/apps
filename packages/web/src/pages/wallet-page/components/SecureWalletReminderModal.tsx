import { useCallback, useEffect, useState } from 'react'

import { useAudioBalance } from '@audius/common/api'
import { AUDIO } from '@audius/fixed-decimal'
import {
  Button,
  Modal,
  ModalContent,
  ModalContentText,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconShieldCheck
} from '@audius/harmony'

import { localStorage } from 'services/local-storage'

const FAQ_URL =
  'https://help.audius.co/product/crypto-wallet-faq-for-audius-users'
const DISMISS_STORAGE_KEY = 'secureWalletReminderDismissedAt'
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000 // 2 weeks
const BALANCE_THRESHOLD = AUDIO(1000).value

const messages = {
  title: 'Protect your $AUDIO',
  body1:
    "You're holding 1000 $AUDIO or more. To keep your funds safe, we recommend moving your balance to an external wallet that only you control.",
  body2:
    "Self-custody means your $AUDIO isn't tied to a single account: you hold the keys, so you're protected even if your password is compromised. Any external wallet can be connected to your Audius account to keep badges and access.",
  body3: 'Read the FAQ to learn how to transfer your balance securely.',
  dismiss: 'Dismiss',
  readFaq: 'Read the FAQ'
}

const wasRecentlyDismissed = async () => {
  const dismissedAt = await localStorage.getItem(DISMISS_STORAGE_KEY)
  if (!dismissedAt) return false
  const timestamp = Number(dismissedAt)
  if (Number.isNaN(timestamp)) return false
  return Date.now() - timestamp < DISMISS_DURATION_MS
}

export const SecureWalletReminderModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { accountBalance, isLoading } = useAudioBalance()

  useEffect(() => {
    if (isLoading || isOpen) return
    if (accountBalance < BALANCE_THRESHOLD) return

    let cancelled = false
    const maybeOpen = async () => {
      const dismissed = await wasRecentlyDismissed()
      if (!cancelled && !dismissed) {
        setIsOpen(true)
      }
    }
    maybeOpen()
    return () => {
      cancelled = true
    }
  }, [accountBalance, isLoading, isOpen])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()))
    setIsOpen(false)
  }, [])

  const handleReadFaq = useCallback(() => {
    window.open(FAQ_URL, '_blank', 'noopener,noreferrer')
    handleDismiss()
  }, [handleDismiss])

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} size='small'>
      <ModalHeader>
        <ModalTitle icon={<IconShieldCheck />} title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText>{messages.body1}</ModalContentText>
        <ModalContentText>{messages.body2}</ModalContentText>
        <ModalContentText>{messages.body3}</ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button fullWidth variant='secondary' onClick={handleDismiss}>
          {messages.dismiss}
        </Button>
        <Button fullWidth variant='primary' onClick={handleReadFaq}>
          {messages.readFaq}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
