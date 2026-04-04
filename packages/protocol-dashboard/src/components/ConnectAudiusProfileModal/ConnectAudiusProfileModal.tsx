import cn from 'clsx'

import Button, { ButtonType } from 'components/Button'
import Modal from 'components/Modal'
import { useConnectAudiusProfile } from 'hooks/useConnectAudiusProfile'

import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner'

import styles from './ConnectAudiusProfileModal.module.css'

const messages = {
  connectAudiusProfileTitle: 'Connect Audius Profile',
  connectAudiusProfileDescriptionP1:
    'Help other users identify you by connecting your Audius account.',
  connectAudiusProfileDescriptionP2:
    'Once you’ve linked your Audius account, your Profile Picture and Display Name will be visible to users throughout the protocol dashboard.',
  connectProfileButton: 'Connect Profile',
  disconnectAudiusProfileTitle: 'Disconnect Audius Profile',
  disconnectProfileButton: 'Disconnect Audius Profile',
  disconnectAudiusProfileDescriptionP1:
    'Your connected Audius profile helps other users identify you throughout the dashboard.',
  disconnectAudiusProfileDescriptionP2:
    'Are you sure you want to disconnect your Audius Profile?',
  disconnectAudiusProfileButton: 'Disconnect Profile'
}
type ConnectAudiusProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  wallet: string
  walletProvider?: any
  action: 'disconnect' | 'connect'
}

export const ConnectAudiusProfileModal = ({
  isOpen,
  onClose,
  wallet,
  walletProvider,
  action
}: ConnectAudiusProfileModalProps) => {
  const { connect, disconnect, isWaiting } = useConnectAudiusProfile({
    wallet,
    walletProvider,
    onSuccess: onClose
  })
  const isConnect = action === 'connect'
  return (
    <Modal
      title={
        isConnect
          ? messages.connectAudiusProfileTitle
          : messages.disconnectAudiusProfileTitle
      }
      isOpen={isOpen}
      onClose={onClose}
      isCloseable
      dismissOnClickOutside
    >
      <div className={styles.innerModalWrapper}>
        <div className={styles.content}>
          <div className={styles.description}>
            <span className={cn({ [styles.boldDescription]: isConnect })}>
              {isConnect
                ? messages.connectAudiusProfileDescriptionP1
                : messages.disconnectAudiusProfileDescriptionP1}
            </span>
            <span
              className={cn({
                [styles.boldDescription]: !isConnect
              })}
            >
              {isConnect
                ? messages.connectAudiusProfileDescriptionP2
                : messages.disconnectAudiusProfileDescriptionP2}
            </span>
          </div>
        </div>
        <Button
          isDisabled={isWaiting}
          rightIcon={isWaiting ? <LoadingSpinner /> : undefined}
          onClick={isConnect ? connect : disconnect}
          type={ButtonType.PRIMARY}
          text={
            isConnect
              ? messages.connectProfileButton
              : messages.disconnectAudiusProfileButton
          }
          className={styles.button}
        />
      </div>
    </Modal>
  )
}
