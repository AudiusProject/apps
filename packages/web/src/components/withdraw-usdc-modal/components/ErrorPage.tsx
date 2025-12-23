import { useFormattedUSDCBalance } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { decimalIntegerToHumanReadable } from '@audius/common/utils'
import { Text, Button, IconValidationX, Flex, Divider } from '@audius/harmony'
import { useField } from 'formik'

import { ADDRESS, AMOUNT } from '../types'

import { TextRow } from './TextRow'

type ErrorPageProps = {
  onClose: () => void
}

export const ErrorPage = ({ onClose }: ErrorPageProps) => {
  const { balanceFormatted } = useFormattedUSDCBalance()

  const [{ value: amountValue }] = useField(AMOUNT)
  const [{ value: addressValue }] = useField(ADDRESS)

  return (
    <Flex column gap='xl'>
      <TextRow left={walletMessages.cashBalance} right={balanceFormatted} />
      <Divider css={{ margin: 0 }} />
      <TextRow
        left={walletMessages.amountToWithdraw}
        right={`${walletMessages.minus}${walletMessages.dollarSign}${decimalIntegerToHumanReadable(amountValue)}`}
      />
      {addressValue ? (
        <>
          <Divider css={{ margin: 0 }} />
          <Flex column gap='s'>
            <TextRow left={walletMessages.destination} />
            <Text variant='body' size='m' strength='default'>
              {addressValue}
            </Text>
          </Flex>
        </>
      ) : null}
      <Flex alignItems='center' gap='s'>
        <IconValidationX size='s' color='danger' />
        <Text variant='body' size='l'>
          {walletMessages.error}
        </Text>
      </Flex>
      <Flex column gap='m'>
        <Button variant='secondary' onClick={onClose} fullWidth>
          {walletMessages.close}
        </Button>
      </Flex>
    </Flex>
  )
}
