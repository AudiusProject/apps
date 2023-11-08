import type { ReactElement } from 'react'

import { useTheme } from '@emotion/react'

import { Flex, Text } from 'components'
import { IconValidationCheck, IconValidationX } from 'icons'

const messages = {
  do: 'Do',
  dont: "Don't"
}

export type ComponentRuleSize = 'small' | 'medium' | 'large'

type ComponentRuleProps = {
  className?: string
  component: ReactElement
  description: ReactElement | string
  isRecommended: boolean
  size: ComponentRuleSize
}

export const ComponentRule = (props: ComponentRuleProps) => {
  const {
    className,
    component,
    size = 'medium',
    description = '',
    isRecommended = false
  } = props
  const TitleIcon = isRecommended ? IconValidationCheck : IconValidationX
  const title = isRecommended ? messages.do : messages.dont

  const { color, cornerRadius } = useTheme()
  const borderColor = isRecommended ? color.status.success : color.status.error

  const sizeMap = {
    small: 100,
    medium: 200,
    large: 400
  }

  return (
    <Flex
      as='section'
      direction='column'
      gap='xl'
      flex={1}
      css={{ minWidth: 400 }}
    >
      <Flex direction='column' gap='m'>
        <Text variant='title' tag='h4' css={{ textTransform: 'uppercase' }}>
          <TitleIcon css={{ marginRight: '4px' }} /> {title}
        </Text>
        <Text tag='section' css={{ height: '40px', overflow: 'hidden' }}>
          {description}
        </Text>
      </Flex>
      <Flex
        className={className}
        as='figure'
        p='2xl'
        border='strong'
        justifyContent='center'
        alignItems='center'
        h={sizeMap[size]}
        css={{
          border: `1px solid ${borderColor}`,
          borderRadius: cornerRadius.m,
          boxSizing: 'content-box',
          '& img': {
            objectFit: 'scale-down',
            width: '100%',
            height: '100%'
          }
        }}
      >
        {component}
      </Flex>
    </Flex>
  )
}
