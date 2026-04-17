import { ReactNode } from 'react'

import { Flex, IconInfo, Text, Tooltip } from '@audius/harmony'

type TokenInfoRowProps = {
  label: string
  value: string | ReactNode
  hasTooltip?: boolean
  tooltipContent?: string
  variant?: 'inline' | 'block'
}

export const TokenInfoRow = ({
  label,
  value,
  hasTooltip,
  tooltipContent,
  variant = 'inline'
}: TokenInfoRowProps) => {
  const labelElement = (
    <Flex alignItems='center' gap='xs'>
      <Text variant='body' size='m' strength='strong' color='subdued'>
        {label}
      </Text>
      {hasTooltip && tooltipContent ? (
        <Tooltip text={tooltipContent} mount='body'>
          <IconInfo size='s' color='subdued' />
        </Tooltip>
      ) : null}
    </Flex>
  )

  const valueElement =
    typeof value === 'string' ? (
      <Text variant='body' size='m' userSelect='text'>
        {value}
      </Text>
    ) : (
      value
    )

  if (variant === 'block') {
    return (
      <Flex direction='column' gap='xs' w='100%'>
        {labelElement}
        {valueElement}
      </Flex>
    )
  }

  return (
    <Flex alignItems='center' justifyContent='space-between' w='100%'>
      {labelElement}
      {valueElement}
    </Flex>
  )
}
