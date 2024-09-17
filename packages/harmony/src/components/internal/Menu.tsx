import { ReactNode, Ref } from 'react'

import { CSSObject } from '@emotion/react'

import { Flex, FlexProps } from 'components/layout/Flex'
import { Paper, PaperProps } from 'components/layout/Paper'
import { Popup } from 'components/popup/Popup'
import { PopupProps } from 'components/popup/types'
import { WithCSS } from 'foundations'

// TODO menu label

export type MenuProps = Omit<PopupProps, 'children'> & {
  children: ReactNode
  PaperProps?: WithCSS<Partial<PaperProps>>
}

export type MenuContentProps = {
  children: ReactNode
  maxHeight?: CSSObject['maxHeight']
  width?: CSSObject['width']
  MenuListProps?: WithCSS<Partial<FlexProps>>
  scrollRef: Ref<HTMLDivElement>
}

export const Menu = (props: MenuProps) => {
  const { children, PaperProps, ...other } = props

  return (
    <Popup {...other}>
      <Paper mt='s' border='strong' shadow='far' {...PaperProps}>
        {children}
      </Paper>
    </Popup>
  )
}

export const MenuContent = (props: MenuContentProps) => {
  const { children, maxHeight, width, MenuListProps, scrollRef } = props

  return (
    <Flex
      direction='column'
      p='s'
      gap='s'
      alignItems='flex-start'
      role='listbox'
      css={{ maxHeight, width, overflowY: 'auto' }}
      ref={scrollRef}
      onClick={(e) => e.stopPropagation()}
      {...MenuListProps}
    >
      {children}
    </Flex>
  )
}
