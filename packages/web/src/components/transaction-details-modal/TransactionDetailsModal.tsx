import { useCallback } from 'react'

import { Status } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import {
  transactionDetailsActions,
  transactionDetailsSelectors
} from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconTransaction,
  Button
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import styles from './TransactionDetailsModal.module.css'
import { TransactionDetailsContent } from './components/TransactionDetailsContent'

const { getTransactionDetails } = transactionDetailsSelectors
const { setModalClosedAction } = transactionDetailsActions

const messages = {
  transactionDetails: 'Transaction Details',
  done: 'Done',
  error: 'Something went wrong.'
}

export const TransactionDetailsModal = NiceModal.create(() => {
  const dispatch = useDispatch()
  const modal = useModal()
  const transactionDetails = useSelector(getTransactionDetails)

  const handleClose = useCallback(() => {
    if (transactionDetails.onModalCloseAction) {
      dispatch(transactionDetails.onModalCloseAction)
      dispatch(setModalClosedAction())
    }
    modal.hide()
  }, [dispatch, modal, transactionDetails])

  return (
    <Modal
      isOpen={modal.visible}
      onClose={handleClose}
      bodyClassName={styles.root}
    >
      <ModalHeader onClose={handleClose}>
        <ModalTitle
          title={messages.transactionDetails}
          icon={<IconTransaction />}
        />
      </ModalHeader>
      <ModalContent>
        {transactionDetails.status === Status.SUCCESS ? (
          <TransactionDetailsContent
            transactionDetails={transactionDetails.transactionDetails}
          />
        ) : transactionDetails.status === Status.LOADING ? (
          <LoadingSpinner className={styles.spinner} />
        ) : transactionDetails.status === Status.ERROR ? (
          <div className={styles.error}>{messages.error}</div>
        ) : null}
      </ModalContent>
      <ModalFooter className={styles.footer}>
        <Button variant='primary' onClick={handleClose}>
          {messages.done}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('TransactionDetails', TransactionDetailsModal)
registerNiceModalId('TransactionDetails')
