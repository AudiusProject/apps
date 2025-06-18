import { useEffect, useState } from 'react'

import { WalletAddress } from '@audius/common/models'
import { tokenDashboardPageSelectors } from '@audius/common/store'
import { AUDIO, AudioWei } from '@audius/fixed-decimal'
import { Button, IconArrowRight } from '@audius/harmony'

import { useSelector } from 'utils/reducer'

import { ModalBodyTitle, ModalBodyWrapper } from '../WalletModal'

import DashboardTokenValueSlider from './DashboardTokenValueSlider'
import DisplayAudio from './DisplayAudio'
import styles from './SendInputConfirmation.module.css'
const { getCanRecipientReceiveWAudio } = tokenDashboardPageSelectors

const messages = {
  title: "YOU'RE ABOUT TO SEND",
  sendButton: 'SEND $AUDIO',
  errorMessage:
    'The destination Solana address does not contain enough SOL to create an $AUDIO wallet.'
}

const LOADING_DURATION = 1000

type SendInputConfirmationProps = {
  balance: AudioWei
  amountToTransfer: AudioWei
  recipientAddress: WalletAddress
  onSend: () => void
}

export const AddressWithArrow = ({ address }: { address: WalletAddress }) => {
  return (
    <div className={styles.addressWrapper}>
      <IconArrowRight className={styles.arrow} />
      {address}
    </div>
  )
}

const SendInputConfirmation = ({
  amountToTransfer,
  balance,
  recipientAddress,
  onSend
}: SendInputConfirmationProps) => {
  const [hasLoadingDurationElapsed, setHasLoadingDurationElapsed] =
    useState(false)
  const canRecipientReceiveWAudio = useSelector(getCanRecipientReceiveWAudio)
  const isLongLoading =
    hasLoadingDurationElapsed && canRecipientReceiveWAudio === 'loading'

  // State to help determine whether to show a loading spinner,
  // for example if Solana is being slow
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasLoadingDurationElapsed(true)
    }, LOADING_DURATION)
    return () => clearTimeout(timer)
  })

  return (
    <ModalBodyWrapper>
      <div className={styles.titleWrapper}>
        <ModalBodyTitle text={messages.title} />
      </div>
      <DashboardTokenValueSlider
        min={AUDIO('0')}
        max={AUDIO(balance)}
        value={AUDIO(amountToTransfer)}
      />
      <DisplayAudio amount={amountToTransfer} />
      <AddressWithArrow address={recipientAddress} />
      <div className={styles.buttonWrapper}>
        <Button
          variant='primary'
          onClick={canRecipientReceiveWAudio === 'true' ? onSend : undefined}
          disabled={canRecipientReceiveWAudio === 'false' || isLongLoading}
          isLoading={isLongLoading}
        >
          {messages.sendButton}
        </Button>
      </div>
      {canRecipientReceiveWAudio === 'false' ? (
        <div className={styles.errorMessage}>{messages.errorMessage}</div>
      ) : null}
    </ModalBodyWrapper>
  )
}

export default SendInputConfirmation
