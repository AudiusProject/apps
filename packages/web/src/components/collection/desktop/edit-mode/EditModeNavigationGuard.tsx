import { useEffect } from 'react'

import { useBlocker } from 'react-router'

import { ConfirmationModal } from 'components/confirmation-modal/ConfirmationModal'

import { usePlaylistEditMode } from './PlaylistEditModeContext'

const messages = {
  header: 'Unsaved Changes',
  description:
    'You have unsaved changes. If you leave this page, your changes will be lost.',
  confirm: 'Leave',
  cancel: 'Stay'
}

export const EditModeNavigationGuard = () => {
  const { isEditMode, hasChanges, status } = usePlaylistEditMode()
  const shouldBlock = isEditMode && hasChanges && status !== 'saving'

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (!shouldBlock) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock])

  useEffect(() => {
    if (blocker.state === 'blocked' && !shouldBlock) {
      blocker.proceed()
    }
  }, [blocker, shouldBlock])

  return (
    <ConfirmationModal
      isOpen={blocker.state === 'blocked'}
      onClose={() => blocker.state === 'blocked' && blocker.reset()}
      messages={messages}
      onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      onCancel={() => blocker.state === 'blocked' && blocker.reset()}
      destructive
    />
  )
}
