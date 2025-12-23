import { USDCPurchaseDetails } from '@audius/common/models'
import { USDC } from '@audius/fixed-decimal'
import { Flex, IconInfo, Text, Tooltip } from '@audius/harmony'

import { SummaryTable, SummaryTableItem } from 'components/summary-table'

import styles from './styles.module.css'

const messages = {
  payExtra: 'Pay Extra',
  total: 'Total',
  subtotal: 'Subtotal',
  paidToArtist: 'Paid to Artist',
  networkFee: 'Network Fee',
  networkFeeRate: '(10%)',
  networkFeeHelp:
    'This fee flows to the community treasury to support the Audius network.'
}

export const TransactionSummary = ({
  transaction,
  isSale = false
}: {
  transaction: USDCPurchaseDetails
  isSale?: boolean
}) => {
  const amount = BigInt(transaction.amount)
  const extraAmount = BigInt(transaction.extraAmount)
  let creatorTotal = BigInt(0)
  let networkFee = BigInt(0)
  for (const split of transaction.splits) {
    if (split.userId) {
      creatorTotal += BigInt(split.amount)
    } else {
      networkFee += BigInt(split.amount)
    }
  }
  const subtotal = isSale ? amount : creatorTotal
  const total = isSale ? extraAmount + creatorTotal : extraAmount + amount

  const items: SummaryTableItem[] = []
  items.push({
    id: 'cost',
    label: isSale ? messages.subtotal : messages.paidToArtist,
    value: USDC(subtotal).toLocaleString('en-US', {
      roundingMode: isSale ? 'floor' : 'ceil'
    })
  })

  if (networkFee > 0) {
    items.push({
      id: 'networkFee',
      label: (
        <Flex gap='s' alignItems='center'>
          <Text>
            {messages.networkFee + ' '}
            <Text color='subdued'>{messages.networkFeeRate}</Text>
          </Text>
          <Tooltip
            className={styles.tooltip}
            color='secondary'
            shouldWrapContent={false}
            text={
              <Text variant='body' size='m'>
                {messages.networkFeeHelp}
              </Text>
            }
            mount='body'
          >
            <IconInfo color='subdued' size='s' />
          </Tooltip>
        </Flex>
      ),
      value: USDC(isSale ? BigInt(0) - networkFee : networkFee).toLocaleString(
        'en-US',
        { roundingMode: 'floor' }
      )
    })
  }

  if (extraAmount !== BigInt(0)) {
    items.push({
      id: 'payExtra',
      label: messages.payExtra,
      value: USDC(extraAmount).toLocaleString()
    })
  }

  return (
    <SummaryTable
      summaryItem={{
        id: 'total',
        label: messages.total,
        value: (
          <Text tag='span' color='accent'>
            {USDC(total).toLocaleString()}
          </Text>
        )
      }}
      items={items}
    />
  )
}
