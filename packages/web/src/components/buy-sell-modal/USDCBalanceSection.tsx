import { Divider, Flex, Text, TooltipPlacement } from '@audius/harmony'

import { TooltipInfoIcon } from './TooltipInfoIcon'

const messages = {
  amount: (amount: string) => `$${amount}`
}

type USDCBalanceSectionProps = {
  title: string
  amount: string
  tooltipPlacement?: TooltipPlacement
  hideTooltip?: boolean
}

export const USDCBalanceSection = ({
  title,
  amount,
  tooltipPlacement,
  hideTooltip
}: USDCBalanceSectionProps) => {
  return (
    <Flex direction='column' gap='l'>
      <Flex alignItems='center' gap='m'>
        <Text variant='title' size='l'>
          {title}
        </Text>
        <Divider css={{ flexGrow: 1 }} />
      </Flex>
      <Flex gap='xs'>
        <Text variant='heading' size='l'>
          {messages.amount(amount)}
        </Text>
        {!hideTooltip ? <TooltipInfoIcon placement={tooltipPlacement} /> : null}
      </Flex>
    </Flex>
  )
}
