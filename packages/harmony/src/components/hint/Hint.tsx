import { ReactNode } from 'react'

import type { IconComponent } from '~harmony/components/icon'
import { Flex } from '~harmony/components/layout'
import { Paper, PaperProps } from '~harmony/components/layout/Paper'
import { Text } from '~harmony/components/text'
import { IconQuestionCircle } from '~harmony/icons'

type HintProps = {
  icon?: IconComponent
  noIcon?: boolean
  actions?: ReactNode
} & PaperProps

export const Hint = (props: HintProps) => {
  const {
    icon: Icon = IconQuestionCircle,
    children,
    actions,
    noIcon,
    ...other
  } = props
  return (
    <Paper
      role='alert'
      backgroundColor='surface2'
      ph='l'
      pv='m'
      direction='column'
      gap='m'
      shadow='flat'
      border='strong'
      {...other}
    >
      <Flex gap='l' alignItems='center'>
        {noIcon ? null : <Icon size='l' color='default' />}
        <Text variant='body' color='default'>
          {children}
        </Text>
      </Flex>
      {actions ? (
        <Flex pl='unit10' gap='l'>
          {actions}
        </Flex>
      ) : null}
    </Paper>
  )
}
