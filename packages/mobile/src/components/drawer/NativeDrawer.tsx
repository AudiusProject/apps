import { useCallback } from 'react'

import type { SetOptional } from 'type-fest'

import { useDrawer } from 'app/hooks/useDrawer'
import type { Drawer as DrawerName } from 'app/store/drawers/slice'

import type { DrawerProps } from './Drawer'
import Drawer from './Drawer'

export type NativeDrawerProps = SetOptional<
  DrawerProps,
  'isOpen' | 'onClose'
> & {
  drawerName: DrawerName
}

export const NativeDrawer = (props: NativeDrawerProps) => {
  const {
    drawerName,
    onClose: onCloseProp,
    onClosed: onClosedProp,
    ...other
  } = props

  const { isOpen, onClose, onClosed, visibleState } = useDrawer(drawerName)

  const handleClose = useCallback(() => {
    onCloseProp?.()
    onClose()
  }, [onCloseProp, onClose])

  const handleClosed = useCallback(() => {
    onClosedProp?.()
    onClosed()
  }, [onClosed, onClosedProp])

  if (visibleState === false) return null

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={handleClosed}
      {...other}
    />
  )
}
