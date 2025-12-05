import { useState, useEffect, useRef } from 'react'

import {
  CommonState,
  confirmerSelectors,
  stemsUploadSelectors,
  uploadSelectors
} from '@audius/common/store'
import { setupHotkeys, removeHotkeys, ModifierKeys } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { ConfirmationModal } from 'components/confirmation-modal/ConfirmationModal'
import { isElectron } from 'utils/clientUtil'

const { getIsConfirming } = confirmerSelectors
const { getIsUploading } = uploadSelectors
const { getIsUploadingStems } = stemsUploadSelectors
const messages = {
  header: 'Hang tight',
  syncDescription:
    "We're still syncing your latest changes. You might lose changes if you leave.",
  uploadDescription:
    "We're still uploading! You might lose changes if you leave.",
  reload: 'Reload',
  quit: 'Quit',
  cancel: 'Cancel'
}

export const UnsavedChangesDialog = () => {
  const [showModal, setShowModal] = useState(false)
  const [reload, setReload] = useState(true)

  const isConfirming = useSelector(getIsConfirming)
  const isUploading = useSelector((state: CommonState) => {
    const isUploading = getIsUploading(state)
    const isStemUploading = getIsUploadingStems(state)
    return isUploading || isStemUploading
  })

  const seenModalRef = useRef(false)
  const hotkeyHookRef =
    useRef<(e: KeyboardEvent) => void | undefined>(undefined)

  const addElectronListener = isElectron()
  const ipcRef = useRef<any>(null)

  useEffect(() => {
    if (isConfirming || isUploading) {
      const beforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault()
        if (!seenModalRef.current) event.returnValue = ''
      }
      window.addEventListener('beforeunload', beforeUnload)

      if (addElectronListener) {
        // Configure IPC so we can send receive/send close/quit events from
        // the main process.
        const ipc = window.require('electron').ipcRenderer
        ipc.on('close', () => {
          setReload(false)
          setShowModal(true)
        })
        ipcRef.current = ipc
      }

      const hotkeyHook = setupHotkeys(
        {
          82 /* r */: {
            cb: onRefreshHotkey,
            or: [ModifierKeys.CTRL, ModifierKeys.CMD]
          }
        },
        /* throttleMs= */ 0
      )
      hotkeyHookRef.current = hotkeyHook
      return () => {
        removeHotkeys(hotkeyHook)
        window.removeEventListener('beforeunload', beforeUnload)
      }
    }
  }, [isConfirming, addElectronListener, isUploading])

  const onRefreshHotkey = () => {
    setReload(true)
    setShowModal(true)
    setTimeout(() => {
      seenModalRef.current = true
    }, 0)
  }

  const onModalClose = () => {
    setShowModal(false)
    setTimeout(() => {
      seenModalRef.current = false
    }, 0)
  }

  const onReloadAnyway = () => {
    setShowModal(false)
    window.location.reload()
  }

  const onQuitAnyway = () => {
    if (ipcRef.current) {
      ipcRef.current.send('quit')
    }
  }

  return (
    <ConfirmationModal
      isOpen={showModal}
      onClose={onModalClose}
      messages={{
        header: messages.header,
        description: isUploading
          ? messages.uploadDescription
          : messages.syncDescription,
        confirm: reload ? messages.reload : messages.quit,
        cancel: messages.cancel
      }}
      onConfirm={reload ? onReloadAnyway : onQuitAnyway}
      onCancel={onModalClose}
      destructive
    />
  )
}
