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

/**
 * Warns the user before navigating away (in-app route change or tab
 * close/refresh) while there are unsaved edits in playlist edit/create mode.
 */
export const EditModeNavigationGuard = () => {
  const { isEditMode, hasChanges, status } = usePlaylistEditMode()
  // Don't block our own redirect once a save/create is underway.
  const shouldBlock = isEditMode && hasChanges && status !== 'saving'

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  )

  // Browser-level navigation (close tab, refresh, external link).
  useEffect(() => {
    if (!shouldBlock) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock])

  // If the changes are saved/discarded while a navigation is blocked, release.
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
