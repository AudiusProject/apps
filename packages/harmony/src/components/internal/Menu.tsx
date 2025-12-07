import { ReactNode, Ref } from 'react'

import { CSSObject } from '@emotion/react'

import { Flex, FlexProps } from '~harmony/components/layout/Flex'
import { Paper, PaperProps } from '~harmony/components/layout/Paper'
import { Popup } from '~harmony/components/popup/Popup'
import { PopupProps } from '~harmony/components/popup/types'
import { WithCSS } from '~harmony/foundations'

// TODO menu label

export type MenuProps = Omit<PopupProps, 'children'> & {
  children: ReactNode
  PaperProps?: WithCSS<Partial<PaperProps>>
}

export type MenuContentProps = {
  children: ReactNode
  maxHeight?: CSSObject['maxHeight']
  width?: CSSObject['width']
  minWidth?: CSSObject['minWidth']
  MenuListProps?: WithCSS<Partial<FlexProps>>
  scrollRef: Ref<HTMLDivElement | null>
  'aria-label'?: string
  'aria-activedescendent'?: string
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
  const {
    children,
    maxHeight,
    width,
    minWidth,
    MenuListProps,
    scrollRef,
    'aria-label': ariaLabel,
    'aria-activedescendent': ariaActiveDescendant
  } = props

  return (
    <Flex
      direction='column'
      p='s'
      gap='s'
      alignItems='flex-start'
      role='listbox'
      css={{ maxHeight, width, minWidth, overflowY: 'auto' }}
      ref={scrollRef}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      aria-activedescendant={ariaActiveDescendant}
      {...MenuListProps}
    >
      {children}
    </Flex>
  )
}
