import { useFormattedUSDCBalance } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import {
  Flex,
  IconLogoCircleUSDCPng,
  Text,
  IconButton,
  IconInfo,
  Tooltip
} from '@audius/harmony'

export const CashBalanceSection = () => {
  const { balanceFormatted } = useFormattedUSDCBalance()

  return (
    <Flex column gap='s'>
      <Flex alignItems='center' justifyContent='space-between'>
        <Flex alignItems='center' gap='s'>
          <IconLogoCircleUSDCPng hex />
          <Text variant='heading' size='s' color='subdued'>
            {walletMessages.cashBalance}
          </Text>
          <Tooltip
            text={walletMessages.cashBalanceTooltip}
            placement='top'
            getPopupContainer={() =>
              document.getElementById('page') ?? document.body
            }
            shouldWrapContent={false}
            shouldDismissOnClick={false}
          >
            <IconButton
              icon={IconInfo}
              size='s'
              color='subdued'
              activeColor='default'
              aria-label='Cash balance information'
            />
          </Tooltip>
        </Flex>
      </Flex>
      <Text variant='display'>{balanceFormatted}</Text>
    </Flex>
  )
}
