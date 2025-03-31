import { Fragment } from 'react'

import { Flex, Text } from '../..'

import type { IconTextProps } from './types'

export const IconText = ({
  children,
  color = 'subdued',
  icons = []
}: IconTextProps) => {
  const separator = (
    <Text variant='body' color={color} style={{ fontSize: 8, lineHeight: 20 }}>
      •
    </Text>
  )

  return (
    <Flex direction='row' gap='xs' alignItems='center'>
      {icons.map(({ icon: Icon, color: iconColor = 'default' }, index) => (
        <Fragment key={`icon${index}`}>
          {index > 0 ? separator : null}
          <Icon size='2xs' color={iconColor} />
        </Fragment>
      ))}
      <Text size='s' color={color}>
        {children}
      </Text>
    </Flex>
  )
}
