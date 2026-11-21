import { useCallback } from 'react'

import { useDispatch } from 'react-redux'

import { clearOfflineDownloads } from 'app/store/offline-downloads/slice'

import { ConfirmationDrawer } from './ConfirmationDrawer'

const messages = {
  header: 'Are You Sure?',
  description:
    'Are you sure you want to remove all of your downloaded content?',
  confirm: 'Remove All Downloads'
}

const drawerName = 'RemoveAllDownloads'

export const RemoveAllDownloadsDrawer = () => {
  const dispatch = useDispatch()

  const handleConfirm = useCallback(() => {
    dispatch(clearOfflineDownloads())
  }, [dispatch])

  return (
    <ConfirmationDrawer
      drawerName={drawerName}
      messages={messages}
      onConfirm={handleConfirm}
    />
  )
}
