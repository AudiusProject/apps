import { USDCTransactionType } from '@audius/common/models'
import { useUSDCTransactionDetailsModal } from '@audius/common/store'
import { makeSolanaTransactionLink, dayjs } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  IconExternalLink,
  Text
} from '@audius/harmony'

import { ExternalTextLink } from 'components/link'

import styles from './USDCTransactionDetailsModal.module.css'

const messages = {
  amountSent: 'Amount Sent',
  destinationWallet: 'Destination Wallet',
  transaction: 'Transaction',
  date: 'Date',
  done: 'Done',
  withdrawal: 'Withdrawal',
  usdcWithdrawal: 'USDC Withdrawal'
}

const DetailSection = ({
  value,
  label
}: {
  value: React.ReactNode
  label: React.ReactNode
}) => (
  <div className={styles.detailSection}>
    <Text variant='label' size='l' color='subdued'>
      {label}
    </Text>
    <Text variant='body' className={styles.detailValue} size='l'>
      {value}
    </Text>
  </div>
)

export const USDCTransactionDetailsModal = () => {
  const { isOpen, data, onClose, onClosed } = useUSDCTransactionDetailsModal()
  const { transactionDetails } = data

  if (!transactionDetails) {
    console.error(
      'USDCTransactionDetailsModal rendered with empty transaction details'
    )
    return null
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} onClosed={onClosed} size={'small'}>
      <ModalHeader>
        <ModalTitle title={messages.withdrawal} />
      </ModalHeader>
      <ModalContent className={styles.content}>
        <DetailSection
          label={messages.transaction}
          value={messages.usdcWithdrawal}
        />
        <DetailSection
          label={messages.date}
          value={dayjs(transactionDetails.transactionDate).format(
            'MMM DD, YYYY'
          )}
        />
        <DetailSection
          label={messages.amountSent}
          value={USDC(BigInt(transactionDetails.change)).toLocaleString()}
        />
        {/* Skip the destination wallet entry for withdrawals to cash */}
        {transactionDetails.transactionType !==
        USDCTransactionType.WITHDRAWAL ? (
          <DetailSection
            label={
              <ExternalTextLink
                to={makeSolanaTransactionLink(transactionDetails.signature)}
              >
                <span className={styles.transactionLink}>
                  {messages.destinationWallet}
                  <IconExternalLink size='s' color='default' />
                </span>
              </ExternalTextLink>
            }
            value={`${transactionDetails.metadata ?? '-'}`}
          />
        ) : null}
      </ModalContent>
      <ModalFooter className={styles.footer}>
        <Button className={styles.button} onClick={onClose}>
          {messages.done}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
