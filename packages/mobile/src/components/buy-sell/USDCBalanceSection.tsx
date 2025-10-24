import React from 'react'

import { Flex, Text } from '@audius/harmony-native'

import { TooltipInfoIcon } from './TooltipInfoIcon'

const messages = {
  amount: (amount: string) => `$${amount}`
}

type USDCBalanceSectionProps = {
  title: string
  amount: string
}

export const USDCBalanceSection = ({
  title,
  amount
}: USDCBalanceSectionProps) => {
  return (
    <Flex direction='column' gap='m'>
      {/* Header */}
      <Flex direction='row' alignItems='center' gap='s'>
        <Text variant='title' size='l'>
          {title}
        </Text>
      </Flex>

      {/* Amount */}
      <Flex row gap='xs'>
        <Text variant='heading' size='l'>
          {messages.amount(amount)}
        </Text>
        <TooltipInfoIcon />
      </Flex>
    </Flex>
  )
}
