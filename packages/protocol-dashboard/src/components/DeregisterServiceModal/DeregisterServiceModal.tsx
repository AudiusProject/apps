import React, { useCallback, useEffect, useState } from 'react'

import Button, { ButtonType } from 'components/Button'
import ConfirmTransactionModal, {
  Box
} from 'components/ConfirmTransactionModal'
import Modal from 'components/Modal'
import TextField from 'components/TextField'
import { useDeregisterService } from 'store/actions/deregisterService'
import { ServiceType, Status } from 'types'
import { useModalControls } from 'utils/hooks'

import styles from './DeregisterServiceModal.module.css'
const messages = {
  title: 'Deregister Service',
  description: 'Are You Sure You Want to Deregister This Service?',
  warning: 'This action can’t be undone.',
  instruction: 'Type DEREGISTER below to continue',
  btn: 'DEREGISTER SERVICE',
  cancel: 'Cancel',
  placeholder: 'DEREGISTER',
  confirmDeregister: 'Deregister',
  validator: 'Validator',
  discoveryProvider: 'Discovery Node'
}

const DEREGISTER = 'DEREGISTER'

type OwnProps = {
  serviceType: ServiceType
  spID: number
  endpoint: string
  isOpen: boolean
  onClose: () => void
  onDeregister: () => void
}

type DeregisterServiceModalProps = OwnProps

const DeregisterServiceModal: React.FC<DeregisterServiceModalProps> = ({
  serviceType,
  spID,
  endpoint,
  isOpen,
  onClose,
  onDeregister
}: DeregisterServiceModalProps) => {
  const [deregisterText, setDeregisterText] = useState('')
  const [hasValidText, setHasValidText] = useState(false)

  const onUpdateDeregisterText = useCallback(
    (value: string) => {
      const text = value.toUpperCase()
      setDeregisterText(value.toUpperCase())
      setHasValidText(text === DEREGISTER)
    },
    [setDeregisterText, setHasValidText]
  )

  // Close All modals on success status
  useEffect(() => {
    setDeregisterText('')
    setHasValidText(false)
  }, [isOpen])

  const { status, deregisterService, error } = useDeregisterService(!isOpen)
  const {
    isOpen: isConfirmModalOpen,
    onClose: onCloseConfirm,
    onClick: onOpenConfirmation
  } = useModalControls()

  const onOpenConfirm = useCallback(() => {
    if (hasValidText) onOpenConfirmation()
  }, [hasValidText, onOpenConfirmation])

  const onConfirm = useCallback(() => {
    deregisterService(serviceType, spID, endpoint)
  }, [spID, deregisterService, serviceType, endpoint])

  useEffect(() => {
    if (status === Status.Success) {
      onClose()
      onDeregister()
    }
  }, [status, onClose, onDeregister])

  const deregisterConfirmation = (
    <Box className={styles.deregisterConfirm}>
      <div className={styles.confirmTitle}>
        {`${messages.confirmDeregister} ${
          serviceType === ServiceType.DiscoveryProvider
            ? messages.discoveryProvider
            : messages.validator
        }`}
      </div>
      <div className={styles.confirmEndpoint}>{endpoint}</div>
    </Box>
  )

  return (
    <Modal
      title={messages.title}
      className={styles.container}
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={status !== Status.Loading}
      dismissOnClickOutside={false}
    >
      <div className={styles.content}>
        <div className={styles.description}>{messages.description}</div>
        <div className={styles.warning}>
          <div>{messages.warning}</div>
          <div>{messages.instruction}</div>
        </div>
        <TextField
          value={deregisterText}
          onChange={onUpdateDeregisterText}
          placeholder={messages.placeholder}
          className={styles.input}
        />
        <div className={styles.btnContainer}>
          <Button
            className={styles.deregister}
            text={messages.btn}
            type={hasValidText ? ButtonType.RED : ButtonType.DISABLED}
            onClick={onOpenConfirm}
          />
          <Button
            className={styles.cancel}
            text={messages.cancel}
            type={ButtonType.PRIMARY}
            onClick={onClose}
          />
        </div>
      </div>
      <ConfirmTransactionModal
        isOpen={isConfirmModalOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        status={status}
        withArrow={false}
        error={error}
        topBox={deregisterConfirmation}
      />
    </Modal>
  )
}

export default DeregisterServiceModal
