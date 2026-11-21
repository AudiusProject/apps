import { useCallback } from 'react'

import type { Modals } from '@audius/common/store'
import { modalsSelectors, modalsActions } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'
import type { SetOptional } from 'type-fest'

import type { DrawerProps } from './Drawer'
import { Drawer } from './Drawer'
const { setVisibility } = modalsActions
const { getModalVisibility } = modalsSelectors

export const useDrawerState = (modalName: Modals) => {
  const dispatch = useDispatch()

  const modalState = useSelector((state) =>
    getModalVisibility(state, modalName)
  )

  const handleClose = useCallback(() => {
    dispatch(setVisibility({ modal: modalName, visible: 'closing' }))
  }, [dispatch, modalName])

  const handleClosed = useCallback(() => {
    dispatch(setVisibility({ modal: modalName, visible: false }))
  }, [dispatch, modalName])

  return {
    isOpen: modalState === true,
    modalState,
    onClose: handleClose,
    onClosed: handleClosed
  }
}

export type AppDrawerProps = SetOptional<DrawerProps, 'isOpen' | 'onClose'> & {
  modalName: Modals
}

export const AppDrawer = (props: AppDrawerProps) => {
  const { modalName, onClose: onCloseProp, ...other } = props

  const { isOpen, onClose, onClosed } = useDrawerState(modalName)

  const handleClose = useCallback(() => {
    onClose()
    onCloseProp?.()
  }, [onClose, onCloseProp])

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={onClosed}
      {...other}
    />
  )
}
